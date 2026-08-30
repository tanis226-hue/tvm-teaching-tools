import { describe, it, expect } from 'vitest'
import {
  solveRetirement, accumulationSeries, drawdownSeries,
  costOfWaiting, toTodaysDollars,
} from './retirement'
import { ESTATE_RESIDUAL } from './assumptions'

const near = (got: number, want: number, tol = 0.005) =>
  expect(Math.abs(got - want) / want).toBeLessThan(tol)

const BASE = { currentAge: 20, retirementAge: 65, desiredMonthlyIncome: 5000 }

describe('published worked example: age 20, retire 65, $5,000/mo', () => {
  const r = solveRetirement(BASE)
  it('inflates income to the retirement date', () => near(r.firstWithdrawal, 18908))
  it('computes the lump sum', () => near(r.lumpSum, 4278724))
  it('computes the first contribution', () => near(r.firstContribution, 644))
  it('computes the final contribution', () => near(r.finalContribution, 2430))
  it('computes total contributed', () => near(r.totalContributed, 726388))
})

describe('cost of waiting, retire 65, $5,000/mo', () => {
  const cases: [number, number][] =
    [[20, 644], [25, 839], [30, 1107], [35, 1486], [40, 2042]]
  it.each(cases)('start age %i requires $%i', (age, want) => {
    near(solveRetirement({ ...BASE, currentAge: age }).firstContribution, want)
  })

  it('is exposed as a series by costOfWaiting', () => {
    const series = costOfWaiting(BASE, [20, 25, 30, 35, 40])
    expect(series.map(s => s.startAge)).toEqual([20, 25, 30, 35, 40])
    near(series[0].contribution, 644)
    near(series[4].contribution, 2042)
  })
})

describe('retirement age sensitivity, age 20, $5,000/mo', () => {
  const cases: [number, number, number][] = [
    [55, 4475000, 1556], [60, 4461945, 1015], [65, 4278724, 644],
    [70, 3855055, 387], [75, 3095719, 209],
  ]
  it.each(cases)('retire at %i', (age, lump, pmt) => {
    const r = solveRetirement({ ...BASE, retirementAge: age })
    near(r.lumpSum, lump)
    near(r.firstContribution, pmt)
  })
})

describe('the shrinking million', () => {
  const cases: [number, number, number][] = [
    [20, 553676, 1806111], [30, 411987, 2427262],
    [40, 306557, 3262038], [45, 264439, 3781596],
  ]
  it.each(cases)('over %i years', (years, back, forward) => {
    near(toTodaysDollars(1_000_000, years), back)
    near(1_000_000 * 1.03 ** years, forward)
  })
})

describe('employer match is a post-solve split', () => {
  const cases: [number, number][] = [[0, 644], [0.25, 515], [0.5, 429], [1, 322]]
  it.each(cases)('match %d leaves the student paying $%i', (rate, personal) => {
    const r = solveRetirement({ ...BASE, matchRate: rate })
    near(r.personalContribution, personal)
    near(r.firstContribution, 644)
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
    near(last.contributed, 726388)
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
    near(series[0].withdrawal, 18908)
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
