'use client'

import { use, useCallback, useEffect, useState } from 'react'
import type { SubmissionRow } from '@/lib/db'
import { median } from '@/lib/stats'
import { usd } from '@/lib/format'
import { DashboardCharts } from '@/components/DashboardCharts'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-slate-300 bg-white p-6">
      <p className="text-lg text-slate-500">{label}</p>
      <p className="mt-1 text-4xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  )
}

export default function DashboardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const [rows, setRows] = useState<SubmissionRow[]>([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${code}/results`)
      if (res.ok) {
        setRows((await res.json()).submissions)
        setError('')
      } else {
        setError((await res.json()).error ?? 'Could not load results')
      }
    } catch {
      setError('Could not reach the server')
    }
  }, [code])

  useEffect(() => {
    load()
    const t = setInterval(load, 4000)
    return () => clearInterval(t)
  }, [load])

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
        <Stat
          label="Range of targets"
          value={rows.length ? `${usd(Math.min(...incomes))} - ${usd(Math.max(...incomes))}` : '-'}
        />
      </div>

      {error && <p className="text-center text-xl text-red-600">{error}</p>}

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
