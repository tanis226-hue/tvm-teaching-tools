'use client'

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  accumulationSeries, drawdownSeries, costOfWaiting,
  purchasingPowerSeries, type RetirementInput,
} from '@/lib/retirement'
import { LIFE_EXPECTANCY, ESTATE_RESIDUAL } from '@/lib/assumptions'
import { usd } from '@/lib/format'
import { ChartFrame } from './ChartFrame'

const compact = (n: number) =>
  `$${Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)}`

// Recharts 3 types tooltip values as ValueType | undefined, so formatters take unknown.
const tipMoney = (v: unknown) => usd(Number(v))
const tipMoneyPerMonth = (v: unknown) => `${usd(Number(v))}/mo`
const tipDollars3 = (v: unknown) => `$${Number(v).toFixed(3)}`
const tipAge = (a: unknown) => `Age ${Math.round(Number(a))}`

// One point per year keeps 540 months from choking the SVG on a phone.
const yearly = <T extends { month: number }>(rows: T[]) => rows.filter(r => r.month % 12 === 0)

export function RetirementCharts({ input }: { input: RetirementInput }) {
  const accum = yearly(accumulationSeries(input))
  const draw = yearly(drawdownSeries(input))
  const waiting = costOfWaiting(input, [20, 25, 30, 35, 40].filter(a => a < input.retirementAge))
  const power = purchasingPowerSeries(input.currentAge, LIFE_EXPECTANCY)
  const residual = (accum.at(-1)?.balance ?? 0) * ESTATE_RESIDUAL

  return (
    <div className="space-y-4">
      <ChartFrame
        title="Your balance over time"
        note="Blue is what you put in. Green is what compounding added."
      >
        <ResponsiveContainer>
          <AreaChart data={accum}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="age" tickFormatter={a => String(Math.round(a))} fontSize={11} />
            <YAxis tickFormatter={compact} fontSize={11} width={48} />
            <Tooltip formatter={tipMoney} labelFormatter={tipAge} />
            <Area
              type="monotone" dataKey="contributed" stackId="1" name="Contributed"
              stroke="#1d4ed8" fill="#bfdbfe"
            />
            <Area
              type="monotone" dataKey="growth" stackId="1" name="Growth"
              stroke="#15803d" fill="#bbf7d0"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        title="What $1 today will be worth"
        note={`3% inflation, from age ${input.currentAge} to ${LIFE_EXPECTANCY}.`}
      >
        <ResponsiveContainer>
          <LineChart data={power}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="age" fontSize={11} />
            <YAxis domain={[0, 1]} tickFormatter={v => `$${v.toFixed(2)}`} fontSize={11} width={48} />
            <Tooltip formatter={tipDollars3} labelFormatter={a => `Age ${a}`} />
            <Line
              type="monotone" dataKey="value" name="Purchasing power"
              stroke="#b91c1c" dot={false} strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        title="The cost of waiting"
        note="Same target, same retirement age. Only the start date changes."
      >
        <ResponsiveContainer>
          <BarChart data={waiting}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="startAge" tickFormatter={a => `Start ${a}`} fontSize={11} />
            <YAxis tickFormatter={compact} fontSize={11} width={48} />
            <Tooltip formatter={tipMoneyPerMonth} labelFormatter={a => `Starting at ${a}`} />
            <Bar dataKey="contribution" name="Monthly contribution" fill="#0f172a" />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        title="Drawing it back down"
        note={`From ${input.retirementAge} to ${LIFE_EXPECTANCY}, landing on ${usd(residual)} left over.`}
      >
        <ResponsiveContainer>
          <AreaChart data={draw}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="age" tickFormatter={a => String(Math.round(a))} fontSize={11} />
            <YAxis tickFormatter={compact} fontSize={11} width={48} />
            <Tooltip formatter={tipMoney} labelFormatter={tipAge} />
            <Area
              type="monotone" dataKey="balance" name="Balance"
              stroke="#7c3aed" fill="#ddd6fe"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  )
}
