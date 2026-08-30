import { NextResponse } from 'next/server'
import { getSession, upsertSubmission } from '@/lib/db'
import { solveRetirement } from '@/lib/retirement'
import { submissionSchema } from '@/lib/validation'

// A session code stays writable only for one lecture's worth of time, so a
// September code cannot still accept submissions in December.
const SESSION_MAX_AGE_MS = 4 * 60 * 60 * 1000

export async function POST(req: Request) {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = submissionSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid submission' },
      { status: 400 },
    )
  }
  const d = parsed.data

  try {
    const session = await getSession(d.code)
    if (!session) return NextResponse.json({ error: 'Unknown session code' }, { status: 404 })
    if (session.closed_at) {
      return NextResponse.json({ error: 'This session is closed' }, { status: 409 })
    }
    if (Date.now() - new Date(session.created_at).getTime() > SESSION_MAX_AGE_MS) {
      return NextResponse.json({ error: 'This session has expired' }, { status: 409 })
    }

    // Recomputed server-side rather than trusted from the client. The route runs
    // in Node and imports the solver directly, so this costs one function call
    // rather than a duplicated implementation.
    const r = solveRetirement({
      currentAge: d.currentAge,
      retirementAge: d.retirementAge,
      desiredMonthlyIncome: d.desiredIncome,
      matchRate: d.matchRate,
    })

    const stored = await upsertSubmission({
      sessionId: session.id,
      deviceHash: d.deviceHash,
      currentAge: d.currentAge,
      retirementAge: d.retirementAge,
      desiredIncome: d.desiredIncome,
      matchRate: d.matchRate,
      firstWithdrawal: r.firstWithdrawal,
      lumpSum: r.lumpSum,
      firstContribution: r.firstContribution,
    })

    if (!stored) {
      return NextResponse.json(
        { error: 'This session has reached its response limit' },
        { status: 429 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
