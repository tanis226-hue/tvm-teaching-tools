'use client'

import { useMemo, useState } from 'react'
import {
  simulateRentBuy, PRESETS, DOWN_PAYMENT_PRESETS, type RentBuyInput,
} from '@/lib/mortgage'
import { usd } from '@/lib/format'
import { SliderRow } from '@/components/SliderRow'
import { Callout } from '@/components/Callout'
import { RentBuyCharts } from '@/components/RentBuyCharts'

const pctFmt = (n: number) => `${(n * 100).toFixed(2)}%`
const money = (n: number) => usd(n)

type PresetName = keyof typeof PRESETS

const PRESET_LABELS: [PresetName, string][] = [
  ['fortMyers', 'Fort Myers'],
  ['national', 'National'],
]

export default function RentBuyPage() {
  const [presetName, setPresetName] = useState<PresetName>('fortMyers')
  const [input, setInput] = useState<RentBuyInput>(PRESETS.fortMyers)

  const set =
    <K extends keyof RentBuyInput>(k: K) =>
    (v: RentBuyInput[K]) =>
      setInput(prev => ({ ...prev, [k]: v }))

  const usePreset = (name: PresetName) => {
    setPresetName(name)
    setInput(PRESETS[name])
  }

  const result = useMemo(() => simulateRentBuy(input), [input])
  const be = result.breakevenMonth
  const threeYear = result.rows[35]

  return (
    <main className="mx-auto max-w-[1600px] space-y-6 px-6 py-8">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-4xl font-bold text-slate-900">Rent or buy?</h1>
        <div className="flex gap-2">
          {PRESET_LABELS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => usePreset(k)}
              className={`rounded-xl border-2 px-5 py-2 text-lg font-semibold ${
                presetName === k
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <section className="rounded-2xl border-2 border-slate-900 bg-slate-900 p-6 text-white">
        <p className="text-xl text-slate-300">Buying pulls ahead of renting after</p>
        <p className="mt-1 text-6xl font-bold tabular-nums">
          {be ? `${(be / 12).toFixed(1)} years` : 'never'}
        </p>
        <p className="mt-2 text-lg text-slate-300">
          {be
            ? `Sell before then and you lose. At three years you are ${usd(
                Math.abs(threeYear.buyerNetWorth - threeYear.renterNetWorth),
              )} behind.`
            : 'With these settings the renter who invests the difference stays ahead for all 30 years.'}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
          <div>
            <p className="text-base text-slate-600">Down payment</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {DOWN_PAYMENT_PRESETS.map(d => (
                <button
                  key={d}
                  onClick={() => set('downPct')(d)}
                  className={`rounded-lg border px-1 py-2 text-sm font-semibold ${
                    input.downPct === d ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'
                  }`}
                >
                  {d * 100}%
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
                    input.termYears === t ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'
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
            step={0.0005} format={pctFmt} onChange={set('rate')} />
          <SliderRow label="Starting rent" value={input.startingRent} min={1000} max={5000}
            step={50} format={money} onChange={set('startingRent')} />
          <SliderRow label="Rent increase" value={input.rentIncreasePct} min={0} max={0.08}
            step={0.0025} format={pctFmt} onChange={set('rentIncreasePct')} />
          <SliderRow label="Home appreciation" value={input.apprPct} min={0} max={0.08}
            step={0.0025} format={pctFmt} onChange={set('apprPct')} />
          <SliderRow label="Investment return" value={input.investReturn} min={0.02} max={0.12}
            step={0.0025} format={pctFmt} onChange={set('investReturn')} />
          <SliderRow label="Insurance, % of value" value={input.insPct} min={0} max={0.03}
            step={0.001} format={pctFmt} onChange={set('insPct')} />
          <SliderRow label="Property tax" value={input.taxPct} min={0} max={0.03}
            step={0.001} format={pctFmt} onChange={set('taxPct')} />
          <SliderRow label="Maintenance" value={input.maintPct} min={0} max={0.03}
            step={0.001} format={pctFmt} onChange={set('maintPct')} />
          <SliderRow label="HOA" value={input.hoaMonthly} min={0} max={800}
            step={25} format={money} onChange={set('hoaMonthly')} />
        </aside>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              ['Cash to close', usd(result.upfront)],
              ['Monthly P&I, fixed', usd(result.monthlyPI)],
              ['Total interest, 30 yrs', usd(result.totalInterest)],
              ['Rent in year 30', usd(result.rows[359].rent)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          <RentBuyCharts input={input} result={result} />

          <div className="grid gap-4 lg:grid-cols-2">
            <Callout title="This model favors the renter">
              It assumes the renter invests every dollar of the difference, every month, at{' '}
              {pctFmt(input.investReturn)}. Almost nobody actually does that. A mortgage is forced
              savings; rent is 100% consumed.
            </Callout>
            <Callout title="Payment lock-in">
              Principal and interest never move for {input.termYears} years. Tax, insurance and
              maintenance still rise with the home&apos;s value, and rent rises fastest of all:{' '}
              {usd(input.startingRent)} today becomes {usd(result.rows[359].rent)} by year 30.
            </Callout>
            <Callout title="Transaction costs punish short holds">
              You pay {pctFmt(input.closingBuyPct)} to buy and {pctFmt(input.closingSellPct)} to
              sell. That is why the breakeven year matters far more than the 30-year figure.
            </Callout>
            <Callout title="Equity is accessible capital">
              By year 10 you hold {usd(result.rows[119].equity)} in equity, which a HELOC or
              cash-out refinance can put to work. Borrowing against your home also puts your home
              at risk.
            </Callout>
          </div>
        </div>
      </div>
    </main>
  )
}
