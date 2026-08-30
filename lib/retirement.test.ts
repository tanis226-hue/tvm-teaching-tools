import { describe, it, expect } from 'vitest'
import {
  solveRetirement, accumulationSeries, drawdownSeries,
  costOfWaiting, toTodaysDollars,
} from './retirement'
import { ESTATE_RESIDUAL, INFLATION } from './assumptions'

const near = (got: number, want: number, tol = 0.005) =>
  expect(Math.abs(got - want) / want).toBeLessThan(tol)

const BASE = { currentAge: 20, retirementAge: 65, desiredMonthlyIncome: 5000 }

describe('published worked example: age 20, retire 65, $5,000/mo', () => {
  const r = solveRetirement(BASE)
  it('inflates income to the retirement date', () => near(r.firstWithdrawal, 15190))
  it('computes the lump sum', () => near(r.lumpSum, 3281473))
  it('computes the first contribution', () => near(r.firstContribution, 531))
  it('computes the final contribution', () => near(r.finalContribution, 1611))
  it('computes total contributed', () => near(r.totalContributed, 525616))
})

describe('cost of waiting, retire 65, $5,000/mo', () => {
  const cases: [number, number][] =
    [[20, 531], [25, 706], [30, 949], [35, 1296], [40, 1813]]
  it.each(cases)('start age %i requires $%i', (age, want) => {
    near(solveRetirement({ ...BASE, currentAge: age }).firstContribution, want)
  })

  it('is exposed as a series by costOfWaiting', () => {
    const series = costOfWaiting(BASE, [20, 25, 30, 35, 40])
    expect(series.map(s => s.startAge)).toEqual([20, 25, 30, 35, 40])
    near(series[0].contribution, 531)
    near(series[4].contribution, 1813)
  })
})

describe('retirement age sensitivity, age 20, $5,000/mo', () => {
  const cases: [number, number, number][] = [
    [55, 3525641, 1305], [60, 3467913, 844], [65, 3281473, 531],
    [70, 2918151, 317], [75, 2313521, 170],
  ]
  it.each(cases)('retire at %i', (age, lump, pmt) => {
    const r = solveRetirement({ ...BASE, retirementAge: age })
    near(r.lumpSum, lump)
    near(r.firstContribution, pmt)
  })
})

describe('the shrinking million', () => {
  const cases: [number, number, number][] = [
    [20, 610271, 1638616], [30, 476743, 2097568],
    [40, 372431, 2685064], [45, 329174, 3037903],
  ]
  it.each(cases)('over %i years', (years, back, forward) => {
    near(toTodaysDollars(1_000_000, years), back)
    near(1_000_000 * (1 + INFLATION) ** years, forward)
  })
})

describe('employer match is a post-solve split', () => {
  const cases: [number, number][] = [[0, 531], [0.25, 425], [0.5, 354], [1, 266]]
  it.each(cases)('match %d leaves the student paying $%i', (rate, personal) => {
    const r = solveRetirement({ ...BASE, matchRate: rate })
    near(r.personalContribution, personal)
    near(r.firstContribution, 531)
    near(r.personalContribution + r.employerContribution, r.firstContribution)
  })
})

describe('accumulation series', () => {
  const r = solveRetirement(BASE)
  const series = accumulationSeries(BASE)

  it('runs one point per month of saving', () => {
    expect(series).toHaveLength(r.monthsSaving)
  })
  it('ends at the required lump sum', () => near(series.at(-1)!.balance, r.lumpSum))
  it('splits balance into contributed plus growth', () => {
    const last = series.at(-1)!
    near(last.contributed + last.growth, last.balance)
    near(last.contributed, 525616)
  })
  it('shows growth dominating contributions by the end', () => {
    expect(series.at(-1)!.growth).toBeGreaterThan(series.at(-1)!.contributed * 3)
  })
})

describe('drawdown series', () => {
  const r = solveRetirement(BASE)
  const series = drawdownSeries(BASE)

  it('runs one point per month of retirement', () => {
    expect(series).toHaveLength(r.monthsDrawing)
  })
  it('starts by withdrawing the inflated income', () => {
    near(series[0].withdrawal, 15190)
  })
  it('lands on the 10 percent nominal residual', () => {
    near(series.at(-1)!.balance, r.lumpSum * ESTATE_RESIDUAL)
  })
  it('never goes negative', () => {
    expect(series.every(p => p.balance >= 0)).toBe(true)
  })
})

describe('guards', () => {
  it('rejects a retirement age at or below the current age', () => {
    expect(() => solveRetirement({ ...BASE, currentAge: 65 })).toThrow(/retirement age/i)
  })
  it('rejects a retirement age at or above life expectancy', () => {
    expect(() => solveRetirement({ ...BASE, retirementAge: 85 })).toThrow(/life expectancy/i)
  })
})
