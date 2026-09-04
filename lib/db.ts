import { neon } from '@neondatabase/serverless'
import { generateSessionCode } from './session-code'

// Lazy so the app builds and Module 2 runs without a database configured.
// Only Module 1's persistence needs DATABASE_URL.
let client: ReturnType<typeof neon> | null = null
function sql() {
  if (!client) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set. See README for Neon setup.')
    client = neon(url)
  }
  return client
}

export type SessionRow = {
  id: string
  code: string
  label: string | null
  closed_at: string | null
  created_at: string
}

// device_hash is deliberately absent. It is the upsert conflict target, so
// publishing it to anyone holding the session code hands out a write key: a
// harvested hash lets an attacker silently UPDATE that student's row, leaving
// the response count unchanged while the medians become fiction.
export type SubmissionRow = {
  current_age: number
  retirement_age: number
  desired_income: number
  match_rate: number
  first_withdrawal: number
  lump_sum: number
  first_contribution: number
  created_at: string
}

// Class data is disposable. Writes already stop four hours after a session is
// created (app/api/submit/route.ts); this is when the rows actually go away.
export const RETENTION_DAYS = 7

// Deleting the session cascades to its submissions. Called on session
// creation rather than from a cron or scheduled function: it needs no extra
// infrastructure and it runs exactly when the app is being used. An idle
// database keeps its last week and stops growing.
export async function purgeExpiredSessions(): Promise<number> {
  const rows = (await sql()`
    delete from sessions
    where created_at < now() - make_interval(days => ${RETENTION_DAYS})
    returning id
  `) as unknown as { id: string }[]
  return rows.length
}

export async function createSession(label: string | null = null) {
  await purgeExpiredSessions()
  const code = generateSessionCode()
  const instructorToken = crypto.randomUUID()
  await sql()`
    insert into sessions (code, instructor_token, label)
    values (${code}, ${instructorToken}, ${label})
  `
  return { code, instructorToken, label }
}

// The age filter, not just the purge, is what makes the retention window real:
// it holds between purges, so an expired session 404s on submit and on the
// dashboard whether or not anyone has started a session lately.
export async function getSession(code: string): Promise<SessionRow | null> {
  const rows = (await sql()`
    select id, code, label, closed_at, created_at from sessions
    where code = ${code.toUpperCase()}
      and created_at >= now() - make_interval(days => ${RETENTION_DAYS})
  `) as unknown as SessionRow[]
  return rows[0] ?? null
}

export type SubmissionArgs = {
  sessionId: string
  deviceHash: string
  currentAge: number
  retirementAge: number
  desiredIncome: number
  matchRate: number
  firstWithdrawal: number
  lumpSum: number
  firstContribution: number
}

export const MAX_SUBMISSIONS_PER_SESSION = 300

// deviceHash is client-supplied and bound to nothing server-side, so a script
// sending a fresh UUID each time defeats the UNIQUE constraint. The cap rides
// inside the same statement rather than a separate count(*) round trip. An
// already-present device_hash still takes the conflict path, so a student
// updating their own answer is never blocked by a full session.
export async function upsertSubmission(a: SubmissionArgs): Promise<boolean> {
  const rows = (await sql()`
    insert into submissions (
      session_id, device_hash, current_age, retirement_age, desired_income,
      match_rate, first_withdrawal, lump_sum, first_contribution
    )
    select ${a.sessionId}, ${a.deviceHash}, ${a.currentAge}, ${a.retirementAge},
           ${a.desiredIncome}, ${a.matchRate}, ${a.firstWithdrawal}, ${a.lumpSum},
           ${a.firstContribution}
    where (
      select count(*) from submissions where session_id = ${a.sessionId}
    ) < ${MAX_SUBMISSIONS_PER_SESSION}
    -- Without this disjunct a full session would filter the row out of the
    -- SELECT entirely, so ON CONFLICT would never fire and a student already
    -- in the session could no longer correct their own answer.
    or exists (
      select 1 from submissions
      where session_id = ${a.sessionId} and device_hash = ${a.deviceHash}
    )
    on conflict (session_id, device_hash) do update set
      current_age = excluded.current_age,
      retirement_age = excluded.retirement_age,
      desired_income = excluded.desired_income,
      match_rate = excluded.match_rate,
      first_withdrawal = excluded.first_withdrawal,
      lump_sum = excluded.lump_sum,
      first_contribution = excluded.first_contribution,
      created_at = now()
    returning id
  `) as unknown as { id: string }[]
  return rows.length > 0
}

export async function listSubmissions(sessionId: string): Promise<SubmissionRow[]> {
  return (await sql()`
    select current_age, retirement_age, desired_income, match_rate,
           first_withdrawal, lump_sum, first_contribution, created_at
    from submissions where session_id = ${sessionId} order by created_at
  `) as unknown as SubmissionRow[]
}

export async function closeSession(code: string, instructorToken: string) {
  const rows = (await sql()`
    update sessions set closed_at = now()
    where code = ${code.toUpperCase()} and instructor_token = ${instructorToken}
    returning id
  `) as unknown as { id: string }[]
  return rows.length > 0
}
