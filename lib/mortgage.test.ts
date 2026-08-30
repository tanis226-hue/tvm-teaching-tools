import { describe, it, expect } from 'vitest'
import {
  simulateRentBuy, FORT_MYERS, NATIONAL, PRESETS, HORIZON_YEARS, TERM_RATES,
  type RentBuyInput,
} from './mortgage'
import { MORTGAGE_RATE, MORTGAGE_RATE_15 } from './assumptions'

const near = (got: number, want: number, tol = 0.005) =>
  expect(Math.abs(got - want) / want).toBeLessThan(tol)

const pmiMonths = (r: ReturnType<typeof simulateRentBuy>) => r.rows.filter(x => x.pmi > 0)

describe('Fort Myers preset', () => {
  const r = simulateRentBuy(FORT_MYERS)
  it('requires $46,200 upfront at 10% down plus 2% buy closing', () => near(r.upfront, 46200))
  it('has a flat P&I of $2,227', () => near(r.monthlyPI, 2226.7))
  it('splits payment 1 into $304 principal and $1,923 interest', () => {
    near(r.rows[0].principal, 304)
    near(r.rows[0].interest, 1923)
  })
  it('pays $455,113 total interest over 30 years', () => near(r.totalInterest, 455113))
  it('grows rent from $2,200 to $10,858 over 50 years', () => {
    near(r.rows[0].rent, 2200)
    near(r.rows[599].rent, 10858)
  })
  it('tracks net worth at years 3, 10, 30 and 50', () => {
    near(r.rows[35].buyerNetWorth, 66712)
    near(r.rows[35].renterNetWorth, 109108)
    near(r.rows[359].buyerNetWorth, 1150329)
    near(r.rows[599].buyerNetWorth, 4955935)
    near(r.rows[599].renterNetWorth, 6708676)
  })
  // Documented deliberately: with sourced 2026 Lee County inputs the buyer does
  // not catch up inside the horizon. See README "What the Fort Myers preset says".
  it('does not break even within 50 years, which is the finding', () => {
    expect(r.breakevenMonth).toBeNull()
    expect(r.settledAheadMonth).toBeNull()
  })
})

describe('National preset', () => {
  const r = simulateRentBuy(NATIONAL)
  it('breaks even at month 124', () => expect(r.breakevenMonth).toBe(124))
  it('settles ahead at the same month, crossing once', () => {
    expect(r.crossings).toHaveLength(1)
    expect(r.settledAheadMonth).toBe(124)
  })
  it('tracks net worth at years 3, 10 and 50', () => {
    near(r.rows[35].buyerNetWorth, 67971)
    near(r.rows[119].buyerNetWorth, 231147)
    near(r.rows[599].buyerNetWorth, 6045543)
    near(r.rows[599].renterNetWorth, 4777832)
  })
  it('grows rent from $2,300 to $11,352', () => {
    near(r.rows[0].rent, 2300)
    near(r.rows[599].rent, 11352)
  })
})

describe('C5: upkeep must never touch the appreciating value', () => {
  // The regression guard for the bug that made higher appreciation reduce the
  // buyer's net worth. Total maintenance and insurance must be IDENTICAL across
  // wildly different appreciation rates.
  it('charges identical lifetime upkeep at 3.75% and 8% appreciation', () => {
    const total = (a: number) =>
      simulateRentBuy({ ...FORT_MYERS, apprPct: a }).rows.reduce((s, x) => s + x.upkeep, 0)
    expect(total(0.0375)).toBeCloseTo(total(0.08), 6)
    expect(total(0.0375)).toBeCloseTo(total(0), 6)
  })
  it('makes buyer net worth strictly increase with appreciation', () => {
    let prev = -Infinity
    for (const a of [0, 0.02, 0.0375, 0.05, 0.0625, 0.08]) {
      const nw = simulateRentBuy({ ...FORT_MYERS, apprPct: a }).rows[599].buyerNetWorth
      expect(nw).toBeGreaterThan(prev)
      prev = nw
    }
  })
})

describe('C6: property tax is the only cost that tracks market value', () => {
  it('lets Florida tax rise with the market but slower, because of the cap', () => {
    const r = simulateRentBuy(FORT_MYERS)
    const eff = (i: number) => (r.rows[i].tax * 12) / r.rows[i].homeValue
    near(r.rows[0].tax * 12, 5030)
    expect(eff(0)).toBeGreaterThan(eff(359))
    expect(eff(359)).toBeGreaterThan(eff(599))
    expect(eff(0)).toBeCloseTo(0.0131, 3)
    expect(eff(599)).toBeCloseTo(0.0073, 3)
  })
  it('keeps a flat rate flat in the National preset', () => {
    const r = simulateRentBuy(NATIONAL)
    const eff = (i: number) => (r.rows[i].tax * 12) / r.rows[i].homeValue
    expect(eff(0)).toBeCloseTo(eff(599), 6)
    expect(eff(0)).toBeCloseTo(NATIONAL.taxPct, 6)
  })
})

describe('C9: PMI applies to the original loan and must terminate', () => {
  const low = simulateRentBuy(FORT_MYERS) // 10% down by default
  const endMonth = (r: ReturnType<typeof simulateRentBuy>) => pmiMonths(r).at(-1)!.month

  it('is charged at 10% down and stops well before the horizon', () => {
    expect(low.rows[0].pmi).toBeGreaterThan(0)
    expect(low.rows[599].pmi).toBe(0)
    expect(endMonth(low)).toBe(110)
  })
  it('is never charged at 20% down', () => {
    const r = simulateRentBuy({ ...FORT_MYERS, downPct: 0.2 })
    expect(r.rows.every(row => row.pmi === 0)).toBe(true)
    expect(r.totalPmi).toBe(0)
  })
  it('has a termination month independent of the appreciation slider', () => {
    const flat = simulateRentBuy({ ...FORT_MYERS, apprPct: 0 })
    const hot = simulateRentBuy({ ...FORT_MYERS, apprPct: 0.08 })
    expect(endMonth(flat)).toBe(endMonth(hot))
    expect(endMonth(flat)).toBe(endMonth(low))
  })
  it('charges a constant monthly amount, since it rides the original loan', () => {
    const months = pmiMonths(low)
    expect(months[0].pmi).toBeCloseTo(months.at(-1)!.pmi, 8)
    near(low.totalPmi, 12070)
  })
})

describe('C10: the 15-year term carries its own rate', () => {
  it('publishes a lower rate for the shorter term', () => {
    expect(TERM_RATES[15]).toBe(MORTGAGE_RATE_15)
    expect(TERM_RATES[30]).toBe(MORTGAGE_RATE)
    expect(TERM_RATES[15]).toBeLessThan(TERM_RATES[30])
  })
  it('pays far less interest on the 15-year at its own rate', () => {
    const short = simulateRentBuy({ ...FORT_MYERS, termYears: 15, rate: TERM_RATES[15] })
    const long = simulateRentBuy(FORT_MYERS)
    expect(short.totalInterest).toBeLessThan(long.totalInterest * 0.45)
  })
})

describe('C3: price-to-rent must stay in a market that has existed', () => {
  it.each(Object.entries(PRESETS))('%s sits between 10x and 22x', (_n, p) => {
    const ratio = p.price / (p.startingRent * 12)
    expect(ratio).toBeGreaterThanOrEqual(10)
    expect(ratio).toBeLessThanOrEqual(22)
  })
})

describe('C1: rates are coherent spreads over inflation', () => {
  const INFL = 0.025
  it('keeps real appreciation positive but under 2pp', () => {
    for (const p of Object.values(PRESETS)) {
      expect(p.apprPct - INFL).toBeGreaterThanOrEqual(0.005)
      expect(p.apprPct - INFL).toBeLessThanOrEqual(0.02)
    }
  })
  it('keeps rent growth within 0.5pp below appreciation', () => {
    for (const p of Object.values(PRESETS)) {
      expect(p.apprPct - p.rentIncreasePct).toBeCloseTo(0.005, 6)
    }
  })
})

describe('50-year horizon', () => {
  const r = simulateRentBuy(FORT_MYERS)
  it('runs 600 months', () => {
    expect(r.rows).toHaveLength(HORIZON_YEARS * 12)
    expect(r.rows.at(-1)!.month).toBe(600)
  })
  it('stops P&I once the loan is repaid but keeps charging carrying costs', () => {
    expect(r.rows[359].pi).toBeGreaterThan(0)
    expect(r.rows[371].pi).toBe(0)
    expect(r.rows[371].buyerOutlay).toBeGreaterThan(0)
    expect(r.rows[371].buyerOutlay).toBeLessThan(r.rows[359].buyerOutlay)
  })
})

describe('back and forth: the paths can cross more than once', () => {
  const single = simulateRentBuy(NATIONAL)
  it('reports one crossing for a clean case', () => {
    expect(single.crossings).toHaveLength(1)
    expect(single.crossings[0]).toBe(single.breakevenMonth)
    expect(single.settledAheadMonth).toBe(single.breakevenMonth)
  })
  it('never reports settledAhead when the buyer ends behind', () => {
    expect(simulateRentBuy(FORT_MYERS).settledAheadMonth).toBeNull()
  })
  it('keeps settledAhead at or after the first crossing when both exist', () => {
    const r = simulateRentBuy(NATIONAL)
    expect(r.settledAheadMonth!).toBeGreaterThanOrEqual(r.breakevenMonth!)
  })
})

describe('inputs that have no slider still drive the model', () => {
  it('charges HOA and inflates it', () => {
    const base = simulateRentBuy(FORT_MYERS)
    const withHoa = simulateRentBuy({ ...FORT_MYERS, hoaMonthly: 400 })
    expect(withHoa.rows[0].buyerOutlay - base.rows[0].buyerOutlay).toBeCloseTo(400, 0)
    expect(withHoa.rows[599].buyerOutlay - base.rows[599].buyerOutlay).toBeGreaterThan(900)
  })
  it('makes selling costs a real lever', () => {
    const free = simulateRentBuy({ ...FORT_MYERS, closingSellPct: 0 })
    expect(free.rows[599].buyerNetWorth).toBeGreaterThan(
      simulateRentBuy(FORT_MYERS).rows[599].buyerNetWorth,
    )
  })
  it('drops flood when the toggle is off', () => {
    const dry = simulateRentBuy({ ...FORT_MYERS, includeFlood: false })
    expect(FORT_MYERS.includeFlood).toBe(true)
    expect(dry.rows[0].upkeep * 12).toBeCloseTo(FORT_MYERS.maintAnnual + FORT_MYERS.insAnnual, 0)
  })
})

describe('numeric safety across every slider bound', () => {
  const bounds: [keyof RentBuyInput, number, number][] = [
    ['price', 150_000, 900_000], ['rate', 0.03, 0.1], ['startingRent', 1000, 5000],
    ['rentIncreasePct', 0, 0.08], ['apprPct', 0, 0.08], ['closingSellPct', 0, 0.1],
    ['investReturn', 0.02, 0.12], ['maintAnnual', 0, 12_000], ['insAnnual', 0, 12_000],
    ['hoaMonthly', 0, 800],
  ]
  it.each(bounds)('%s at both bounds produces finite numbers', (k, lo, hi) => {
    for (const v of [lo, hi]) {
      const r = simulateRentBuy({ ...FORT_MYERS, [k]: v })
      for (const row of [r.rows[0], r.rows[359], r.rows[599]]) {
        for (const val of Object.values(row)) expect(Number.isFinite(val)).toBe(true)
      }
    }
  })
})
