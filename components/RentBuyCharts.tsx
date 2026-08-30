'use client'

import {
  Area, AreaChart, CartesianGrid, ComposedChart, Label, Legend, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { RentBuyInput, RentBuyResult } from '@/lib/mortgage'
import { usd } from '@/lib/format'
import { ChartFrame } from './ChartFrame'

const compact = (n: number) =>
  `$${Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)}`

const tipMoney = (v: unknown) => usd(Number(v))
const tipYear = (y: unknown) => `Year ${Number(y).toFixed(1)}`

const AXIS = 18
const LABEL = 15

// A whole-year ReferenceLine disagreed with a hero that says 5.7, and rounded
// to x=0 (off a category axis, so invisible) for any crossing under 6 months.
// A numeric x-axis takes the fractional year directly.
const yearLine = (month: number | null) => (month === null ? null : Math.max(0.1, month / 12))

export function RentBuyCharts({ input, result }: { input: RentBuyInput; result: RentBuyResult }) {
  const yearly = result.rows.filter(r => r.month % 12 === 0)

  const data = yearly.map(r => ({
    year: r.month / 12,
    pi: r.pi,
    rent: r.rent,
    buyerOutlay: r.buyerOutlay,
    buyer: r.buyerNetWorth,
    renter: r.renterNetWorth,
    principal: r.principal,
    interest: r.interest,
  }))

  // Buyer's money gone = everything paid that does not come back, seeded with
  // the purchase closing costs. Derived from buyerOutlay rather than
  // re-deriving the carrying costs, which is what silently dropped HOA.
  // Kept is cumulative PRINCIPAL, not gross equity: equity includes
  // appreciation the buyer did not pay for, and plotting it here read as
  // "green over red" while the hero said the buyer was behind.
  let goneBuyer = input.price * input.closingBuyPct
  let keptBuyer = 0
  let goneRenter = 0
  const flow = result.rows.reduce<
    { year: number; goneBuyer: number; keptBuyer: number; goneRenter: number }[]
  >((acc, r) => {
    goneBuyer += r.buyerOutlay - r.principal
    keptBuyer += r.principal
    goneRenter += r.renterOutlay
    if (r.month % 12 === 0) {
      acc.push({ year: r.month / 12, goneBuyer, keptBuyer, goneRenter })
    }
    return acc
  }, [])

  const beYear = yearLine(result.breakevenMonth)
  const crossYear = yearLine(result.outlayCrossingMonth)

  const xAxis = (
    <XAxis
      type="number" dataKey="year" domain={[0, 30]} ticks={[0, 5, 10, 15, 20, 25, 30]}
      fontSize={AXIS} tickMargin={4}
    >
      <Label value="Years after buying" position="insideBottom" offset={-4} fontSize={LABEL} />
    </XAxis>
  )

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartFrame
        projector
        title="Fixed payment vs rising rent"
        note={
          input.termYears < 30
            ? `P&I never moves for ${input.termYears} years, then drops to zero. Rent compounds at ${(input.rentIncreasePct * 100).toFixed(1)}% a year, forever.`
            : `P&I never moves. Rent compounds at ${(input.rentIncreasePct * 100).toFixed(1)}% a year. The buyer's all-in cost starts above the rent and is overtaken later.`
        }
      >
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            {xAxis}
            <YAxis tickFormatter={compact} fontSize={AXIS} width={78}>
              <Label value="Per month" angle={-90} position="insideLeft" fontSize={LABEL} />
            </YAxis>
            <Tooltip formatter={tipMoney} labelFormatter={tipYear} />
            <Legend />
            <Line dataKey="pi" name="Mortgage P&I" stroke="#1d4ed8" dot={false} strokeWidth={3} isAnimationActive={false} />
            <Line dataKey="rent" name="Rent" stroke="#b91c1c" dot={false} strokeWidth={3} isAnimationActive={false} />
            {/* "Renter, all in" was rent + a flat $15: it drew 0.3px from the
                rent line at every month and was never visible. Folded into the label. */}
            <Line
              dataKey="buyerOutlay" name="Buyer, all in (tax, insurance, upkeep)"
              stroke="#1d4ed8" dot={false} strokeWidth={2} strokeDasharray="6 4"
              isAnimationActive={false}
            />
            {crossYear && (
              <ReferenceLine
                x={crossYear} stroke="#0f172a" strokeDasharray="2 2"
                label={{ value: 'All-in costs cross', position: 'insideTopLeft', fontSize: LABEL, fill: '#0f172a' }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        projector
        title="Where each payment goes"
        note={`Payment 1 is ${usd(result.rows[0].principal)} principal against ${usd(result.rows[0].interest)} interest. Only ${((result.rows[0].principal / (result.rows[0].pi || 1)) * 100).toFixed(1)}% builds equity. It reverses, slowly.`}
      >
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            {xAxis}
            <YAxis tickFormatter={compact} fontSize={AXIS} width={78}>
              <Label value="Per month" angle={-90} position="insideLeft" fontSize={LABEL} />
            </YAxis>
            <Tooltip formatter={tipMoney} labelFormatter={tipYear} />
            <Legend />
            {/* Slate vs green, not red vs green: the two fills were 1.19:1 apart
                and collapsed entirely under deuteranopia. */}
            <Area dataKey="interest" stackId="1" name="Interest" stroke="#0f172a" fill="#94a3b8" fillOpacity={0.85} isAnimationActive={false} />
            <Area dataKey="principal" stackId="1" name="Principal" stroke="#15803d" fill="#86efac" fillOpacity={0.85} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        projector
        title="Net worth, both paths"
        note={
          beYear
            ? `Buying pulls ahead in year ${(result.breakevenMonth! / 12).toFixed(1)}.`
            : 'Buying never pulls ahead with these settings.'
        }
      >
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            {xAxis}
            <YAxis tickFormatter={compact} fontSize={AXIS} width={78}>
              <Label value="Net worth" angle={-90} position="insideLeft" fontSize={LABEL} />
            </YAxis>
            <Tooltip formatter={tipMoney} labelFormatter={tipYear} />
            <Legend />
            <Line dataKey="buyer" name="Buyer" stroke="#1d4ed8" dot={false} strokeWidth={3} isAnimationActive={false} />
            <Line dataKey="renter" name="Renter" stroke="#b91c1c" dot={false} strokeWidth={3} isAnimationActive={false} />
            {beYear && (
              <ReferenceLine
                x={beYear} stroke="#0f172a"
                label={{ value: 'Breakeven', position: 'insideTopLeft', fontSize: LABEL, fill: '#0f172a' }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        projector
        title="Cash out vs wealth kept, both paths"
        note="Interest, tax, insurance, upkeep and closing costs are consumed. Only principal is retained. The renter's line is every rent cheque, none of which comes back."
      >
        <ResponsiveContainer>
          <ComposedChart data={flow} margin={{ top: 8, right: 12, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            {xAxis}
            <YAxis tickFormatter={compact} fontSize={AXIS} width={78}>
              <Label value="Cumulative" angle={-90} position="insideLeft" fontSize={LABEL} />
            </YAxis>
            <Tooltip formatter={tipMoney} labelFormatter={tipYear} />
            <Legend />
            <Area dataKey="goneBuyer" name="Buyer: spent and gone" stroke="#0f172a" fill="#94a3b8" fillOpacity={0.85} isAnimationActive={false} />
            <Area dataKey="keptBuyer" name="Buyer: principal retained" stroke="#15803d" fill="#86efac" fillOpacity={0.85} isAnimationActive={false} />
            {/* PRD chart 5: the renter half of the comparison. */}
            <Line dataKey="goneRenter" name="Renter: rent paid, all gone" stroke="#b91c1c" dot={false} strokeWidth={3} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  )
}
