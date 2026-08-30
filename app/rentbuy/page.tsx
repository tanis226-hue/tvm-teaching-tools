'use client'

import { useMemo, useState } from 'react'
import {
  simulateRentBuy, PRESETS, DOWN_PAYMENT_PRESETS, HORIZON_YEARS, type RentBuyInput,
} from '@/lib/mortgage'
import { RETURN_PRE } from '@/lib/assumptions'
import { usd } from '@/lib/format'
import { SliderRow } from '@/components/SliderRow'
import { Callout } from '@/components/Callout'
import { FormulaToggle } from '@/components/FormulaToggle'
import { RentBuyCharts } from '@/components/RentBuyCharts'

const pctFmt = (n: number) => `${(n * 100).toFixed(2)}%`
const money = (n: number) => usd(n)

type PresetName = keyof typeof PRESETS

const PRESET_LABELS: [PresetName, string][] = [
  ['fortMyers', 'Fort Myers'],
  ['national', 'National'],
]

const sameAsPreset = (a: RentBuyInput, b: RentBuyInput) =>
  (Object.keys(b) as (keyof RentBuyInput)[]).every(k => a[k] === b[k])

export default function RentBuyPage() {
  const [input, setInput] = useState<RentBuyInput>(PRESETS.fortMyers)

  const set =
    <K extends keyof RentBuyInput>(k: K) =>
    (v: RentBuyInput[K]) =>
      setInput(prev => ({ ...prev, [k]: v }))

  // Derived, not stored. A stored presetName kept the Fort Myers chip black for
  // the whole lesson even after ten sliders had been dragged off it.
  const activePreset =
    PRESET_LABELS.find(([k]) => sameAsPreset(input, PRESETS[k]))?.[0] ?? null

  const result = useMemo(() => simulateRentBuy(input), [input])
  const be = result.breakevenMonth
  const settled = result.settledAheadMonth
  const reCrosses = result.crossings.length > 1
  const threeYear = result.rows[35]
  const gapAtThree = threeYear.buyerNetWorth - threeYear.renterNetWorth
  const pmiRows = result.rows.filter(r => r.pmi > 0)
  const lastRow = result.rows.at(-1)!
  const borrowable = Math.max(
    0,
    0.85 * result.rows[119].homeValue - result.rows[119].balance,
  )

  // Four genuinely different outcomes. Reporting only the first crossing
  // collapsed the last two into a confident "pulls ahead in year 5.3" for a
  // case where the renter retakes the lead at 23.3 and keeps it for 27 years.
  const yr = (m: number) => (m / 12).toFixed(1)
  const headline =
    be === null
      ? {
          lead: 'Buying pulls ahead after',
          figure: 'never',
          detail: `The renter who invests the difference stays ahead for all ${HORIZON_YEARS} years.`,
        }
      : settled === null
        ? {
            lead: 'Buying leads, then loses it',
            figure: `yrs ${yr(be)} to ${yr(result.crossings.at(-1)!)}`,
            detail: `The buyer goes ahead in year ${yr(be)} but the renter takes the lead back in year ${yr(result.crossings.at(-1)!)} and keeps it to year ${HORIZON_YEARS}. There is no single breakeven here.`,
          }
        : reCrosses
          ? {
              lead: 'Buying only stays ahead after',
              figure: `${yr(settled)} years`,
              detail: `The paths change places ${result.crossings.length} times, first in year ${yr(be)}. Treat everything in between as a tie, not a win.`,
            }
          : {
              lead: 'Buying pulls ahead after',
              figure: `${yr(settled)} years`,
              detail:
                gapAtThree < 0
                  ? `Sell at three years and the transaction costs are not earned back yet: ${usd(-gapAtThree)} short.`
                  : `Even at three years the buyer is ${usd(gapAtThree)} ahead here.`,
            }

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-6">
      <header className="flex flex-wrap items-baseline justify-between gap-4 pb-4">
        <h1 className="text-4xl font-bold text-slate-900">Rent or buy?</h1>
        <div className="flex gap-2">
          {PRESET_LABELS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setInput(PRESETS[k])}
              className={`rounded-xl border-2 px-5 py-2 text-lg font-semibold ${
                activePreset === k
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Sticky: at 1280x720 reaching the lower sliders pushed the headline
          335px off screen, so the room could not see what was changing.
          The headline reports where the buyer STAYS ahead, not the first
          crossing: in 3.7% of slider positions the paths cross more than once
          and the first crossing is not the answer. */}
      <section className="sticky top-0 z-20 -mx-6 flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b-2 border-slate-900 bg-slate-900 px-6 py-3 text-white">
        <p className="text-lg text-slate-300">{headline.lead}</p>
        <p className="text-4xl font-bold tabular-nums">{headline.figure}</p>
        <p className="text-base text-slate-300">{headline.detail}</p>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
          <div>
            <p className="text-base text-slate-600">Down payment</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {DOWN_PAYMENT_PRESETS.map(d => (
                <button
                  key={d}
                  onClick={() => set('downPct')(d)}
                  className={`rounded-lg border px-1 py-2 text-sm font-semibold ${
                    input.downPct === d
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-400 text-slate-700'
                  }`}
                >
                  {+(d * 100).toFixed(1)}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-base text-slate-600">Term</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[15, 30].map(t => (
                <button
                  key={t}
                  onClick={() => set('termYears')(t)}
                  className={`rounded-lg border px-2 py-2 text-sm font-semibold ${
                    input.termYears === t
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-400 text-slate-700'
                  }`}
                >
                  {t} years
                </button>
              ))}
            </div>
          </div>

          <SliderRow label="Home price" value={input.price} min={150000} max={800000}
            step={10000} format={money} onChange={set('price')} />
          <SliderRow label="Mortgage rate" value={input.rate} min={0.03} max={0.1}
            step={0.0025} format={pctFmt} onChange={set('rate')} />
          <SliderRow label="Starting rent" value={input.startingRent} min={1000} max={5000}
            step={50} format={money} onChange={set('startingRent')} />
          <SliderRow label="Rent increase" value={input.rentIncreasePct} min={0} max={0.08}
            step={0.0025} format={pctFmt} onChange={set('rentIncreasePct')} />
          <SliderRow label="Home appreciation" value={input.apprPct} min={0} max={0.08}
            step={0.0025} format={pctFmt} onChange={set('apprPct')} />
          {/* The PRD calls sale closing costs "critical - this is what punishes
              short holds", so it has to be draggable, not read-only prose. */}
          <SliderRow label="Closing costs to sell" value={input.closingSellPct} min={0} max={0.08}
            step={0.005} format={pctFmt} onChange={set('closingSellPct')} />
          <SliderRow
            label={`Investment return (same ${(RETURN_PRE * 100).toFixed(1)}% as the retirement module)`}
            value={input.investReturn} min={0.02} max={0.12}
            step={0.0025} format={pctFmt} onChange={set('investReturn')} />
          <SliderRow label="Insurance, % of value" value={input.insPct} min={0} max={0.03}
            step={0.001} format={pctFmt} onChange={set('insPct')} />
          <SliderRow label="Property tax" value={input.taxPct} min={0} max={0.03}
            step={0.001} format={pctFmt} onChange={set('taxPct')} />
          <SliderRow label="Maintenance" value={input.maintPct} min={0} max={0.03}
            step={0.001} format={pctFmt} onChange={set('maintPct')} />
          <SliderRow label="HOA" value={input.hoaMonthly} min={0} max={800}
            step={25} format={money} onChange={set('hoaMonthly')} />

          {/* Four model inputs had no control and appeared nowhere on screen. */}
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-700">Fixed, not adjustable</p>
            <dl className="mt-1 space-y-0.5">
              {[
                ['Closing costs to buy', pctFmt(input.closingBuyPct)],
                ['PMI (under 20% down)', `${pctFmt(input.pmiPct)}/yr`],
                ['Renters insurance', `${usd(input.rentersInsMonthly)}/mo`],
                ['Horizon', `${HORIZON_YEARS} years`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-sm text-slate-600">{k}</dt>
                  <dd className="text-sm font-medium tabular-nums text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              ['Cash to close', usd(result.upfront)],
              ['Monthly P&I, fixed', usd(result.monthlyPI)],
              [`Total interest, ${input.termYears} yrs`, usd(result.totalInterest)],
              [`Rent in year ${HORIZON_YEARS}`, usd(lastRow.rent)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-600">{label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          <RentBuyCharts input={input} result={result} />

          <div className="grid gap-4 lg:grid-cols-2">
            <Callout title="Read the red line: that is the case for buying">
              In <em>Fixed payment vs rising rent</em>, the flat blue line is principal and
              interest and the red one is rent. Rent starts at {usd(input.startingRent)} and
              reaches {usd(lastRow.rent)} by year {HORIZON_YEARS}; the blue line never moves once.
              That divergence is the whole argument, and it is why the green marker at year{' '}
              {input.termYears} matters: after it the blue line is zero and the red one is still
              climbing.
            </Callout>

            <Callout title="Why the two net worth lines start so close together">
              In <em>Where each payment goes</em>, the grey band is interest and the thin green
              sliver is principal. Payment one is {usd(result.rows[0].principal)} of principal
              against {usd(result.rows[0].interest)} of interest. For the early years the buyer is
              mostly renting money from a bank, so almost nothing is being retained yet.
            </Callout>

            <Callout title="This model favors the renter">
              The red line in <em>Net worth</em> assumes the renter invests every dollar of the
              difference, every month, at {pctFmt(input.investReturn)}, and never once spends it.
              Almost nobody does that. A mortgage forces the saving; rent is 100% consumed. Both
              lines are pre-tax, and only the buyer is charged the cost of selling.
            </Callout>

            <Callout title="Transaction costs punish short holds">
              The buyer&apos;s line in <em>Net worth</em> does not start level with the
              renter&apos;s, it starts below it. That gap is {pctFmt(input.closingBuyPct)} to buy
              plus {pctFmt(input.closingSellPct)} to sell, charged from day one, and it is why the
              lines take years to cross. Drag the selling-costs slider to zero and watch the
              crossing jump left.
            </Callout>

            <Callout title="Equity is accessible capital">
              The green band in <em>Cash out vs wealth kept</em> is principal repaid. Counting
              appreciation too, year 10 equity is {usd(result.rows[119].equity)}, of which about{' '}
              {usd(borrowable)} could actually be borrowed at a typical 85% combined loan-to-value
              limit. A HELOC or cash-out refinance can fund a business or an education. It also
              puts your home at risk.
            </Callout>

            {input.downPct < 0.2 && pmiRows.length > 0 && (
              <Callout title="Under 20% down, you also pay PMI">
                Private mortgage insurance costs {usd(pmiRows[0].pmi)} a month here and buys you
                nothing: it protects the lender. It is inside the dashed blue line on the first
                chart. It stops in month {pmiRows.at(-1)!.month}, once the balance falls to 78% of
                the original price, having cost {usd(pmiRows.reduce((s, r) => s + r.pmi, 0))} in
                total. Appreciation does not end it early.
              </Callout>
            )}

            <Callout title="The breakeven is a band, not a date">
              {reCrosses
                ? `Look at how close the two lines run in Net worth: they swap places ${result.crossings.length} times. Any single breakeven year inside that stretch is noise, not a finding.`
                : 'Where the two lines in Net worth nearly touch, a small change to any slider flips the answer.'}{' '}
              The figure is shown to one decimal because the arithmetic is exact, not because the
              answer is. The model leaves out security deposits, moving costs and lease-break fees,
              and ignores the mortgage interest deduction, which for most filers is worth little
              once the standard deduction is counted. Treat it as plus or minus six months.
            </Callout>
          </div>

          <FormulaToggle>
            <pre>
{`r  = ${(input.rate * 100).toFixed(2)}% / 12          monthly mortgage rate
N  = ${input.termYears * 12} months            loan term
H  = ${HORIZON_YEARS * 12} months            comparison horizon
i  = ${(input.investReturn * 100).toFixed(2)}% / 12          monthly investment return (APR/12)
a  = (1 + ${(input.apprPct * 100).toFixed(2)}%)^(1/12) - 1   monthly appreciation, geometric
g  = (1 + ${(input.rentIncreasePct * 100).toFixed(2)}%)^(1/12) - 1   monthly rent growth, geometric

P&I     = L x r / (1 - (1+r)^-N) = ${Math.round(result.monthlyPI)}
upfront = price x down% + price x buy closing% = ${Math.round(result.upfront)}

Each month:
  buyer outlay  = P&I + (value x (tax% + upkeep% + insurance%))/12 + HOA + PMI
                  P&I is zero after month N; the carrying costs are not
  renter outlay = rent + renters insurance
  whoever pays less invests the difference at i
  PMI applies only if down% < 20%, and stops when balance/ORIGINAL price <= 78%

  buyer net worth  = value - balance - value x sell closing% + buyer investments
  renter net worth = renter investments

  first crossing = first month buyer net worth > renter net worth
  stays ahead    = month after the LAST time the buyer is behind
  these differ whenever the paths cross more than once

Rates use APR/12; the 3% growth series compound geometrically each month,
the same convention as the retirement module. ${(input.investReturn * 100).toFixed(1)}% APR compounded
monthly is ${(((1 + input.investReturn / 12) ** 12 - 1) * 100).toFixed(2)}% effective.`}
            </pre>
          </FormulaToggle>
        </div>
      </div>
    </main>
  )
}
