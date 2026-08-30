'use client'

import {
  Area, AreaChart, CartesianGrid, ComposedChart, Label, Legend, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { RentBuyInput, RentBuyResult } from '@/lib/mortgage'
import { HORIZON_YEARS } from '@/lib/mortgage'
import { usd } from '@/lib/format'
import { ChartFrame } from './ChartFrame'

const compact = (n: number) =>
  `$${Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)}`

const tipMoney = (v: unknown) => usd(Number(v))
const tipYear = (y: unknown) => `Year ${Number(y).toFixed(1)}`

const AXIS = 18
const LABEL = 15
const TICKS = [0, 10, 20, 30, 40, 50]

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
  const settledYear = yearLine(result.settledAheadMonth)
  const crossYear = yearLine(result.outlayCrossingMonth)
  const payoff = input.termYears
  const reCrosses = result.crossings.length > 1

  const xAxis = (
    <XAxis
      type="number" dataKey="year" domain={[0, HORIZON_YEARS]} ticks={TICKS}
      fontSize={AXIS} tickMargin={4}
    >
      <Label value="Years after buying" position="insideBottom" offset={-4} fontSize={LABEL} />
    </XAxis>
  )

  const payoffLine = (
    <ReferenceLine
      x={payoff} stroke="#15803d" strokeDasharray="4 3"
      // Bottom, not top: at year 30 this collided with the breakeven and
      // outlay-crossing labels, which both sit top-left.
      label={{ value: 'Mortgage paid off', position: 'insideBottomRight', fontSize: LABEL, fill: '#15803d' }}
    />
  )

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartFrame
        projector
        title="Fixed payment vs rising rent"
        note={`The flat blue line is principal and interest: it never moves for ${payoff} years, then drops to zero at the green marker. The red line is rent, compounding ${(input.rentIncreasePct * 100).toFixed(1)}% a year to ${usd(result.rows[599].rent)} by year ${HORIZON_YEARS}. The dashed blue line is the buyer's true all-in cost, which starts above the rent and is overtaken at the black marker.`}
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
            {payoffLine}
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        projector
        title="Where each payment goes"
        note={`Grey is interest, green is principal. Payment 1 is ${usd(result.rows[0].principal)} principal against ${usd(result.rows[0].interest)} interest, so only ${((result.rows[0].principal / (result.rows[0].pi || 1)) * 100).toFixed(1)}% of it builds equity. Watch where the grey band finally falls below the green one, and note that both vanish at year ${payoff} when the loan is repaid.`}
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
          result.breakevenMonth === null
            ? `The blue line never gets above the red one. With these settings the renter who invests the difference stays ahead for the whole ${HORIZON_YEARS} years.`
            : result.settledAheadMonth === null
              ? `Blue goes above red in year ${(result.breakevenMonth / 12).toFixed(1)}, but red takes the lead back in year ${(result.crossings.at(-1)! / 12).toFixed(1)} and holds it to year ${HORIZON_YEARS}. Buying wins the middle of this race and loses the end.`
              : reCrosses
                ? `The lines change places ${result.crossings.length} times, at years ${result.crossings.map(m => (m / 12).toFixed(1)).join(', ')}. Blue first crosses red in year ${(result.breakevenMonth / 12).toFixed(1)}, but only stays above it from year ${(result.settledAheadMonth / 12).toFixed(1)}. Where they run together, the honest answer is that it is a tie.`
                : `Blue crosses red once, in year ${(result.breakevenMonth / 12).toFixed(1)}, and stays above it. The gap widens fastest after year ${payoff}, when the mortgage payment stops and the whole of it starts being invested.`
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
                label={{ value: reCrosses ? '1st cross' : 'Breakeven', position: 'insideTopLeft', fontSize: LABEL, fill: '#0f172a' }}
              />
            )}
            {reCrosses && settledYear && (
              <ReferenceLine
                x={settledYear} stroke="#0f172a" strokeDasharray="5 3"
                label={{ value: 'Stays ahead', position: 'insideTopRight', fontSize: LABEL, fill: '#0f172a' }}
              />
            )}
            {payoffLine}
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        projector
        title="Cash out vs wealth kept, both paths"
        note={`Grey is every dollar the buyer spends that does not come back: interest, tax, insurance, upkeep and closing costs. Green is the only part they keep, the principal. The red line is the renter's cumulative rent, all of it gone. Grey sits above green for decades, which is the point.`}
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
            {payoffLine}
          </ComposedChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  )
}
