import { describe, it, expect } from 'vitest'
import { simulateRentBuy, FORT_MYERS, NATIONAL, PRESETS, type RentBuyInput } from './mortgage'

const near = (got: number, want: number, tol = 0.005) =>
  expect(Math.abs(got - want) / want).toBeLessThan(tol)

describe('Fort Myers preset', () => {
  const r = simulateRentBuy(FORT_MYERS)
  it('requires $80,500 upfront', () => near(r.upfront, 80500))
  it('has a flat P&I of $1,798', () => near(r.monthlyPI, 1798))
  it('breaks even at month 68', () => expect(r.breakevenMonth).toBe(68))
  it('pays $367,101 total interest', () => near(r.totalInterest, 367101))
  it('splits payment 1 into $246 principal and $1,552 interest', () => {
    near(r.rows[0].principal, 246)
    near(r.rows[0].interest, 1552)
  })
  it('crosses on total outlay in year 7.3', () => {
    expect(Math.round((r.outlayCrossingMonth! / 12) * 10) / 10).toBe(7.3)
  })
  it('grows rent from $2,500 to $6,053', () => {
    near(r.rows[0].rent, 2500)
    near(r.rows[359].rent, 6053)
  })
  it('builds equity of $153,132 / $255,450 / $982,378', () => {
    near(r.rows[59].equity, 153132)
    near(r.rows[119].equity, 255450)
    near(r.rows[359].equity, 982378)
  })
  it('tracks net worth at years 3, 10 and 30', () => {
    near(r.rows[35].buyerNetWorth, 94533)
    near(r.rows[35].renterNetWorth, 110827)
    near(r.rows[119].buyerNetWorth, 228099)
    near(r.rows[119].renterNetWorth, 194443)
    near(r.rows[359].buyerNetWorth, 1247769)
    near(r.rows[359].renterNetWorth, 867374)
  })
})

describe('National preset', () => {
  const r = simulateRentBuy(NATIONAL)
  it('breaks even at month 74', () => expect(r.breakevenMonth).toBe(74))
  it('crosses on total outlay in year 8.1', () => {
    expect(Math.round((r.outlayCrossingMonth! / 12) * 10) / 10).toBe(8.1)
  })
  it('grows rent from $2,200 to $5,327', () => {
    near(r.rows[0].rent, 2200)
    near(r.rows[359].rent, 5327)
  })
  it('tracks net worth at years 3, 10 and 30', () => {
    near(r.rows[35].renterNetWorth, 112292)
    near(r.rows[119].buyerNetWorth, 227078)
    near(r.rows[359].buyerNetWorth, 1231894)
  })
})

describe('the two presets share buyer-side figures', () => {
  const fm = simulateRentBuy(FORT_MYERS)
  const nat = simulateRentBuy(NATIONAL)

  it('has identical equity, since equity ignores rent and insurance', () => {
    near(fm.rows[359].equity, nat.rows[359].equity)
  })

  // Deliberate assertion, not an oversight. While the buyer's outlay exceeds
  // the renter's, the buyer invests nothing, so buyer net worth is purely
  // home value minus balance minus selling costs. Insurance differences
  // surface only in the RENTER's invested balance. This looks like a bug on
  // inspection and is not.
  it('has identical early buyer net worth despite different insurance', () => {
    near(fm.rows[35].buyerNetWorth, nat.rows[35].buyerNetWorth)
    expect(fm.rows[35].renterNetWorth).not.toBeCloseTo(nat.rows[35].renterNetWorth, 0)
  })
})

describe('both presets land in the required 5-8 year window', () => {
  it.each(Object.entries(PRESETS))('%s', (_name, preset) => {
    const years = simulateRentBuy(preset).breakevenMonth! / 12
    expect(years).toBeGreaterThanOrEqual(5)
    expect(years).toBeLessThanOrEqual(8)
  })
})

describe('breakeven stays responsive to the instructor sliders', () => {
  const cases: [string, Partial<RentBuyInput>, number][] = [
    ['appreciation 2.0%', { apprPct: 0.02 }, 12.9],
    ['appreciation 5.0%', { apprPct: 0.05 }, 3.2],
    ['return 6.0%', { investReturn: 0.06 }, 4.5],
    ['return 9.0%', { investReturn: 0.09 }, 9.0],
    ['rate 5.5%', { rate: 0.055 }, 3.7],
    ['rate 8.0%', { rate: 0.08 }, 19.2],
    ['15-year term', { termYears: 15 }, 5.9],
  ]
  it.each(cases)('%s moves breakeven to about %s years', (_l, patch, want) => {
    const r = simulateRentBuy({ ...FORT_MYERS, ...patch })
    expect(Math.abs(r.breakevenMonth! / 12 - want)).toBeLessThan(0.15)
  })
})

describe('PMI', () => {
  it('is charged below 20% equity and drops once reached', () => {
    const r = simulateRentBuy({ ...FORT_MYERS, downPct: 0.035 })
    expect(r.rows[0].pmi).toBeGreaterThan(0)
    expect(r.rows[359].pmi).toBe(0)
  })
  it('is never charged at 20% down', () => {
    const r = simulateRentBuy(FORT_MYERS)
    expect(r.rows.every(row => row.pmi === 0)).toBe(true)
  })
})

describe('the PRD defaults that failed review', () => {
  it('never breaks even, which is why they were retuned', () => {
    const r = simulateRentBuy({ ...FORT_MYERS, startingRent: 1800, insPct: 0.005 })
    expect(r.breakevenMonth).toBeNull()
    expect(r.rows[359].buyerNetWorth).toBeLessThan(r.rows[359].renterNetWorth)
  })
})
