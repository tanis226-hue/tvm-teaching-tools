'use client'

import {
  Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { RentBuyInput, RentBuyResult } from '@/lib/mortgage'
import { usd } from '@/lib/format'
import { ChartFrame } from './ChartFrame'

const compact = (n: number) =>
  `$${Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)}`

const tipMoney = (v: unknown) => usd(Number(v))
const tipYear = (y: unknown) => `Year ${y}`

export function RentBuyCharts({ input, result }: { input: RentBuyInput; result: RentBuyResult }) {
  const yearly = result.rows.filter(r => r.month % 12 === 0)

  const data = yearly.map(r => ({
    year: r.month / 12,
    pi: r.pi,
    rent: r.rent,
    buyerOutlay: r.buyerOutlay,
    renterOutlay: r.renterOutlay,
    buyer: r.buyerNetWorth,
    renter: r.renterNetWorth,
    principal: r.principal,
    interest: r.interest,
  }))

  // Running total of everything the buyer spends that does not come back.
  let goneRunning = 0
  const moneyFlow = result.rows.reduce<{ year: number; gone: number; kept: number }[]>(
    (acc, r) => {
      goneRunning +=
        r.interest + r.pmi + (r.homeValue * (input.taxPct + input.maintPct + input.insPct)) / 12
      if (r.month % 12 === 0) acc.push({ year: r.month / 12, gone: goneRunning, kept: r.equity })
      return acc
    },
    [],
  )

  const beYear = result.breakevenMonth ? result.breakevenMonth / 12 : null

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ChartFrame
        title="Fixed payment vs rising rent"
        note={`P&I never moves. Rent compounds at ${(input.rentIncreasePct * 100).toFixed(1)}% a year.`}
      >
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" fontSize={14} />
            <YAxis tickFormatter={compact} fontSize={14} width={60} />
            <Tooltip formatter={tipMoney} labelFormatter={tipYear} />
            <Legend />
            <Line dataKey="pi" name="Mortgage P&I" stroke="#1d4ed8" dot={false} strokeWidth={3} isAnimationActive={false} />
            <Line dataKey="rent" name="Rent" stroke="#b91c1c" dot={false} strokeWidth={3} isAnimationActive={false} />
            <Line
              dataKey="buyerOutlay" name="Buyer, all in" stroke="#1d4ed8"
              dot={false} strokeDasharray="4 4" isAnimationActive={false} />
            <Line
              dataKey="renterOutlay" name="Renter, all in" stroke="#b91c1c"
              dot={false} strokeDasharray="4 4" isAnimationActive={false} />
            {result.outlayCrossingMonth && (
              <ReferenceLine
                x={Math.round(result.outlayCrossingMonth / 12)}
                stroke="#0f172a" strokeDasharray="2 2"
                label={{ value: 'All-in costs cross', position: 'top', fontSize: 12 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        title="Where each payment goes"
        note="Early payments are almost all interest. It reverses, slowly."
      >
        <ResponsiveContainer>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" fontSize={14} />
            <YAxis tickFormatter={compact} fontSize={14} width={60} />
            <Tooltip formatter={tipMoney} labelFormatter={tipYear} />
            <Legend />
            <Area dataKey="interest" stackId="1" name="Interest" stroke="#b91c1c" fill="#fecaca" isAnimationActive={false} />
            <Area dataKey="principal" stackId="1" name="Principal" stroke="#15803d" fill="#bbf7d0" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        title="Net worth, both paths"
        note={
          beYear
            ? `Buying pulls ahead in year ${beYear.toFixed(1)}.`
            : 'Buying never pulls ahead with these settings.'
        }
      >
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" fontSize={14} />
            <YAxis tickFormatter={compact} fontSize={14} width={60} />
            <Tooltip formatter={tipMoney} labelFormatter={tipYear} />
            <Legend />
            <Line dataKey="buyer" name="Buyer" stroke="#1d4ed8" dot={false} strokeWidth={3} isAnimationActive={false} />
            <Line dataKey="renter" name="Renter" stroke="#b91c1c" dot={false} strokeWidth={3} isAnimationActive={false} />
            {beYear && (
              <ReferenceLine
                x={Math.round(beYear)} stroke="#0f172a"
                label={{ value: 'Breakeven', position: 'top', fontSize: 12 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        title="Money gone vs money kept"
        note="Interest, tax, insurance and maintenance are consumed. Principal is retained."
      >
        <ResponsiveContainer>
          <AreaChart data={moneyFlow}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" fontSize={14} />
            <YAxis tickFormatter={compact} fontSize={14} width={60} />
            <Tooltip formatter={tipMoney} labelFormatter={tipYear} />
            <Legend />
            <Area dataKey="gone" name="Spent and gone" stroke="#b91c1c" fill="#fecaca" isAnimationActive={false} />
            <Area dataKey="kept" name="Equity retained" stroke="#15803d" fill="#bbf7d0" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  )
}
