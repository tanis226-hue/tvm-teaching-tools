'use client'

import { use, useCallback, useEffect, useState } from 'react'
import type { SubmissionRow } from '@/lib/db'
import { median } from '@/lib/stats'
import { usd } from '@/lib/format'
import { DashboardCharts } from '@/components/DashboardCharts'
import { instructorTokenKey } from '@/app/instructor/page'

const POLL_MS = 8_000
// A dashboard left open on a projector or a laptop lid would otherwise poll
// forever, keeping Neon's compute above its 5-minute scale-to-zero threshold
// and burning the whole monthly free budget in about two weeks. When that
// budget runs out the database suspends and every Module 1 route fails for the
// rest of the month, so this cap is the difference between a slow page and a
// dead one in the next lecture.
const MAX_POLL_MS = 3 * 60 * 60 * 1000

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-slate-300 bg-white p-6">
      <p className="text-lg text-slate-500">{label}</p>
      <p className="mt-1 text-4xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  )
}

function percentileSpread(xs: number[]): string {
  if (xs.length === 0) return '-'
  const s = [...xs].sort((a, b) => a - b)
  const at = (q: number) => s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))]
  return `${usd(at(0.1))} - ${usd(at(0.9))}`
}

export default function DashboardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const [rows, setRows] = useState<SubmissionRow[]>([])
  const [error, setError] = useState('')
  const [stopped, setStopped] = useState(false)
  const [closed, setClosed] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    try {
      setToken(sessionStorage.getItem(instructorTokenKey(code)))
    } catch {
      setToken(null)
    }
  }, [code])

  async function closeSession() {
    if (!token) return
    if (!confirm('Close this session? Students will no longer be able to submit, and it cannot be reopened.')) return
    const res = await fetch(`/api/sessions/${code}/close`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ instructorToken: token }),
    })
    if (res.ok) {
      setClosed(true)
      setStopped(true)
    } else {
      const body = await res.json().catch(() => null)
      setError(body?.error ?? `Could not close the session (${res.status})`)
    }
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${code}/results`)
      const body = await res.json().catch(() => null)
      if (res.ok && body?.submissions) {
        setRows(body.submissions)
        setError('')
      } else {
        setError(body?.error ?? `Could not load results (${res.status})`)
      }
    } catch {
      setError('Could not reach the server')
    }
  }, [code])

  useEffect(() => {
    if (stopped) return
    const startedAt = Date.now()
    load()
    const t = setInterval(() => {
      if (Date.now() - startedAt > MAX_POLL_MS) {
        setStopped(true)
        return
      }
      // A buried tab still fires chained timers about once a minute, which is
      // well inside Neon's suspend window, so background throttling is not a
      // substitute for this check.
      if (document.visibilityState === 'visible') load()
    }, POLL_MS)
    return () => clearInterval(t)
  }, [load, stopped])

  const incomes = rows.map(r => Number(r.desired_income))
  const contributions = rows.map(r => Number(r.first_contribution))

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-4xl font-bold text-slate-900">Class results</h1>
        <p className="font-mono text-3xl font-bold tracking-widest text-slate-500">{code}</p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Responses" value={String(rows.length)} />
        <Stat label="Median target income" value={usd(median(incomes))} />
        <Stat label="Median monthly saving" value={usd(median(contributions))} />
        {/* Min-to-max would be pinned to the full legal range by any two
            students who pick the extremes, which happens immediately. */}
        <Stat label="Middle 80% of targets" value={percentileSpread(incomes)} />
      </div>

      {error && <p className="text-center text-xl text-red-600">{error}</p>}

      {closed && (
        <p className="rounded-2xl border-2 border-slate-900 bg-slate-900 p-4 text-center text-xl font-semibold text-white">
          Session closed. No further submissions will be accepted.
        </p>
      )}

      {token && !closed && (
        <div className="text-center">
          <button
            onClick={closeSession}
            className="rounded-xl border-2 border-slate-400 px-6 py-2 text-base font-semibold text-slate-700"
          >
            Close session
          </button>
        </div>
      )}

      {stopped && (
        <div className="rounded-2xl border-2 border-amber-500 bg-amber-50 p-6 text-center">
          <p className="text-lg text-amber-900">
            Live updates paused to save database time.
          </p>
          <button
            onClick={() => setStopped(false)}
            className="mt-3 rounded-xl border-2 border-slate-900 px-6 py-3 text-lg font-semibold"
          >
            Resume
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="py-24 text-center text-3xl text-slate-400">
          Waiting for the first response...
        </p>
      ) : (
        <DashboardCharts rows={rows} />
      )}
    </main>
  )
}
