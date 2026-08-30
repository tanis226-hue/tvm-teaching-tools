'use client'

import { use, useEffect, useMemo, useState } from 'react'
import { solveRetirement, toTodaysDollars } from '@/lib/retirement'
import { getDeviceHash } from '@/lib/device'
import { usd } from '@/lib/format'
import { NumberField } from '@/components/NumberField'
import { ResultCard } from '@/components/ResultCard'
import { AssumptionsPanel } from '@/components/AssumptionsPanel'
import { FormulaToggle } from '@/components/FormulaToggle'
import { RetirementCharts } from '@/components/RetirementCharts'

const MATCH_PRESETS = [0, 0.25, 0.5, 1]

export default function StudentPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const [currentAge, setCurrentAge] = useState(20)
  const [retirementAge, setRetirementAge] = useState(65)
  const [desiredIncome, setDesiredIncome] = useState(5000)
  const [matchRate, setMatchRate] = useState(0)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  const safeRetirementAge = Math.max(retirementAge, currentAge + 1)
  const input = useMemo(
    () => ({
      currentAge,
      retirementAge: safeRetirementAge,
      desiredMonthlyIncome: desiredIncome,
      matchRate,
    }),
    [currentAge, safeRetirementAge, desiredIncome, matchRate],
  )
  const r = useMemo(() => solveRetirement(input), [input])
  const years = safeRetirementAge - currentAge

  useEffect(() => {
    setStatus('idle')
  }, [input])

  async function submit() {
    setStatus('sending')
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code,
          deviceHash: getDeviceHash(code),
          currentAge,
          retirementAge: safeRetirementAge,
          desiredIncome,
          matchRate,
        }),
      })
      if (res.ok) {
        setStatus('sent')
        return
      }
      setError((await res.json()).error ?? 'Something went wrong')
    } catch {
      setError('Could not reach the server')
    }
    setStatus('error')
  }

  return (
    <main className="mx-auto max-w-lg space-y-5 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">What will retirement cost you?</h1>
        <p className="mt-1 text-sm text-slate-500">Session {code}</p>
      </header>

      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
        <NumberField
          label="Your age now" value={currentAge} min={16} max={70}
          onChange={n => {
            setCurrentAge(n)
            if (retirementAge <= n) setRetirementAge(n + 1)
          }}
        />
        <NumberField
          label="Retire at age" value={retirementAge} min={45} max={80}
          onChange={setRetirementAge}
        />
        <NumberField
          label="Monthly income you want, in today's dollars"
          value={desiredIncome} min={500} max={50000} step={100}
          onChange={setDesiredIncome}
        />

        <div>
          <span className="text-sm font-medium text-slate-600">Employer match</span>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {MATCH_PRESETS.map(m => (
              <button
                key={m}
                onClick={() => setMatchRate(m)}
                className={`rounded-lg border px-2 py-2 text-sm font-medium ${
                  matchRate === m
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 text-slate-700'
                }`}
              >
                {m === 0 ? 'None' : `${m * 100}%`}
              </button>
            ))}
          </div>
          {matchRate > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              Simplified: a real match is usually a percentage up to a share of your salary.
            </p>
          )}
        </div>
      </section>

      {/* Order is fixed by the spec: the intimidating numbers land before the reassuring one. */}
      <ResultCard
        emphasis="hero"
        label={`${usd(desiredIncome)}/mo today becomes, at ${safeRetirementAge}`}
        nominal={r.firstWithdrawal}
        todaysDollars={desiredIncome}
        caption={`${years} years of 3% inflation. That is your first month's withdrawal.`}
      />

      <ResultCard
        label="Lump sum you need at retirement"
        nominal={r.lumpSum}
        todaysDollars={toTodaysDollars(r.lumpSum, years)}
        caption="Enough to draw a rising income to 85 and leave 10% behind."
      />

      <ResultCard
        label="Save this much per month, starting now"
        nominal={r.firstContribution}
        todaysDollars={r.firstContribution}
        caption={`Rising 3% a year to ${usd(r.finalContribution)} by age ${safeRetirementAge - 1}.`}
      />

      {matchRate > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <ResultCard label="You pay" nominal={r.personalContribution} />
          <ResultCard label="Employer pays" nominal={r.employerContribution} />
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-700">Where the money comes from</h2>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500">You contribute</p>
            <p className="text-xl font-semibold tabular-nums">{usd(r.totalContributed)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">You end up with</p>
            <p className="text-xl font-semibold tabular-nums">{usd(r.lumpSum)}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          The {usd(r.lumpSum - r.totalContributed)} gap is compounding, not saving.
        </p>
      </section>

      <RetirementCharts input={input} />
      <AssumptionsPanel />

      <FormulaToggle>
        <pre>
{`i  = 0.04/12          monthly return in retirement
ip = 0.075/12         monthly return while saving
g  = 1.03^(1/12) - 1  monthly inflation
N  = ${r.monthsSaving} months saving
n  = ${r.monthsDrawing} months drawing down

P   = ${desiredIncome} x 1.03^${years} = ${Math.round(r.firstWithdrawal)}
PV  = P / (i - g) x [1 - ((1+g)/(1+i))^n]
L   = PV / (1 - 0.10/(1+i)^n) = ${Math.round(r.lumpSum)}
FV  = [(1+ip)^N - (1+g)^N] / (ip - g)
PMT = L / FV = ${Math.round(r.firstContribution)}`}
        </pre>
      </FormulaToggle>

      <button
        onClick={submit}
        disabled={status === 'sending' || status === 'sent'}
        className="w-full rounded-xl bg-slate-900 py-4 text-lg font-semibold text-white disabled:bg-slate-400"
      >
        {status === 'sent'
          ? 'Sent to the class results'
          : status === 'sending'
            ? 'Sending...'
            : 'Send my answer to the class'}
      </button>
      {status === 'sent' && (
        <p className="text-center text-sm text-slate-500">
          Anonymous. Change anything above and send again to update your answer.
        </p>
      )}
      {status === 'error' && <p className="text-center text-sm text-red-600">{error}</p>}
    </main>
  )
}
