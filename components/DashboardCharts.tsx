'use client'

import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Scatter, ScatterChart,
  Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts'
import { histogram, INCOME_BUCKETS } from '@/lib/stats'
import type { SubmissionRow } from '@/lib/db'
import { usd } from '@/lib/format'

const tipMoney = (v: unknown, name: unknown) =>
  name === 'Monthly' ? usd(Number(v)) : String(v)

export function DashboardCharts({ rows }: { rows: SubmissionRow[] }) {
  const incomes = rows.map(r => Number(r.desired_income))
  const buckets = histogram(incomes, INCOME_BUCKETS)
  const scatter = rows.map(r => ({
    x: Number(r.retirement_age),
    y: Number(r.first_contribution),
  }))

  // Explicit bounds rather than the 'dataMin - 2' string form, so an empty
  // session still gets a sensible axis instead of an empty domain.
  const ages = scatter.map(p => p.x)
  const xDomain: [number, number] = ages.length
    ? [Math.min(...ages) - 2, Math.max(...ages) + 2]
    : [45, 80]

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-800">What the class wants to live on</h2>
        <p className="mt-1 text-base text-slate-500">Desired monthly income, today&apos;s dollars.</p>
        <div className="mt-4 h-80">
          <ResponsiveContainer>
            <BarChart data={buckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
              <XAxis dataKey="label" fontSize={18} />
              <YAxis allowDecimals={false} fontSize={18} width={40} />
              <Tooltip />
              <Bar dataKey="count" name="Students" fill="#470a68" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-800">Retire earlier, save more</h2>
        <p className="mt-1 text-base text-slate-500">
          Each dot is one anonymous answer.
        </p>
        <div className="mt-4 h-80">
          <ResponsiveContainer>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
              <XAxis
                type="number" dataKey="x" name="Retirement age"
                domain={xDomain} allowDecimals={false} fontSize={18}
              />
              <YAxis
                type="number" dataKey="y" name="Monthly"
                tickFormatter={v => usd(v)} fontSize={18} width={80}
              />
              <ZAxis range={[300, 300]} />
              <Tooltip formatter={tipMoney} />
              <Scatter data={scatter} fill="#00bfaa" stroke="#009684" strokeWidth={1} isAnimationActive={false} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
