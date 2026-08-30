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
  const low = simulateRentBuy({ ...FORT_MYERS, downPct: 0.035 })
  const endMonth = (r: ReturnType<typeof simulateRentBuy>) =>
    r.rows.filter(x => x.pmi > 0).at(-1)!.month

  it('is charged below 20% equity and drops once reached', () => {
    expect(low.rows[0].pmi).toBeGreaterThan(0)
    expect(low.rows[359].pmi).toBe(0)
  })
  it('is never charged at 20% down', () => {
    const r = simulateRentBuy(FORT_MYERS)
    expect(r.rows.every(row => row.pmi === 0)).toBe(true)
  })

  // The previous two assertions passed under BOTH the correct rule and the
  // bug that terminated PMI against the appreciated value. These three do not.
  it('is still charged well past the month appreciation alone would clear it', () => {
    expect(low.rows[99].pmi).toBeGreaterThan(0)
  })
  it('terminates at 78% of the ORIGINAL price, not the appreciated value', () => {
    expect(endMonth(low)).toBe(143)
  })
  it('has a termination month independent of the appreciation slider', () => {
    const flat = simulateRentBuy({ ...FORT_MYERS, downPct: 0.035, apprPct: 0 })
    const hot = simulateRentBuy({ ...FORT_MYERS, downPct: 0.035, apprPct: 0.08 })
    expect(endMonth(flat)).toBe(endMonth(hot))
    expect(endMonth(flat)).toBe(endMonth(low))
  })
})

describe('inputs that have no slider still drive the model', () => {
  it('charges HOA and inflates it', () => {
    const withHoa = simulateRentBuy({ ...FORT_MYERS, hoaMonthly: 400 })
    expect(withHoa.rows[0].buyerOutlay - simulateRentBuy(FORT_MYERS).rows[0].buyerOutlay)
      .toBeCloseTo(400, 0)
    // month 360 HOA has inflated from 400 at 3%/yr
    const late = withHoa.rows[359].buyerOutlay - simulateRentBuy(FORT_MYERS).rows[359].buyerOutlay
    expect(late).toBeGreaterThan(900)
  })
  it('makes selling costs the lever the PRD says they are', () => {
    const free = simulateRentBuy({ ...FORT_MYERS, closingSellPct: 0 })
    expect(free.breakevenMonth!).toBeLessThan(simulateRentBuy(FORT_MYERS).breakevenMonth!)
    expect(free.breakevenMonth!).toBe(23)
  })
  it('charges renters insurance every month', () => {
    const none = simulateRentBuy({ ...FORT_MYERS, rentersInsMonthly: 0 })
    expect(simulateRentBuy(FORT_MYERS).rows[0].renterOutlay - none.rows[0].renterOutlay)
      .toBeCloseTo(15, 6)
  })
})

describe('the hero sentence must not claim the buyer is behind when they are ahead', () => {
  it('has a config where the buyer leads at three years', () => {
    const r = simulateRentBuy({ ...FORT_MYERS, price: 150_000 })
    expect(r.breakevenMonth).toBeLessThan(36)
    expect(r.rows[35].buyerNetWorth).toBeGreaterThan(r.rows[35].renterNetWorth)
  })
})

describe('the PRD defaults that failed review', () => {
  it('never breaks even, which is why they were retuned', () => {
    const r = simulateRentBuy({ ...FORT_MYERS, startingRent: 1800, insPct: 0.005 })
    expect(r.breakevenMonth).toBeNull()
    expect(r.rows[359].buyerNetWorth).toBeLessThan(r.rows[359].renterNetWorth)
  })
})

describe('50-year horizon', () => {
  const r = simulateRentBuy(FORT_MYERS)
  it('runs 600 months', () => {
    expect(r.rows).toHaveLength(600)
    expect(r.rows.at(-1)!.month).toBe(600)
  })
  it('leaves the year-30 figures untouched at index 359', () => {
    near(r.rows[359].buyerNetWorth, 1247769)
    near(r.rows[359].rent, 6053)
  })
  it('stops P&I once the loan is repaid but keeps charging carrying costs', () => {
    expect(r.rows[359].pi).toBeGreaterThan(0)
    expect(r.rows[371].pi).toBe(0)
    expect(r.rows[371].buyerOutlay).toBeGreaterThan(0)
    expect(r.rows[371].buyerOutlay).toBeLessThan(r.rows[359].buyerOutlay)
  })
  it('does not let the longer horizon rig the comparison', () => {
    // The buyer/renter ratio must stay stable, not run away, or the module
    // becomes the "buying always wins" demo the PRD warned against.
    const ratio = (m: number) => r.rows[m - 1].buyerNetWorth / r.rows[m - 1].renterNetWorth
    expect(Math.abs(ratio(600) - ratio(360))).toBeLessThan(0.1)
  })
  it('still never breaks even on the original PRD defaults, even given 50 years', () => {
    const prd = simulateRentBuy({ ...FORT_MYERS, startingRent: 1800, insPct: 0.005 })
    expect(prd.breakevenMonth).toBeNull()
    expect(prd.settledAheadMonth).toBeNull()
  })
})

describe('back and forth: the paths can cross more than once', () => {
  const single = simulateRentBuy(FORT_MYERS)
  it('reports one crossing for the default preset', () => {
    expect(single.crossings).toHaveLength(1)
    expect(single.crossings[0]).toBe(single.breakevenMonth)
    expect(single.settledAheadMonth).toBe(single.breakevenMonth)
  })

  // Found by sweeping the slider grid: 190 of 5,184 configurations re-cross.
  const multi = simulateRentBuy({
    ...FORT_MYERS, apprPct: 0.03, investReturn: 0.08, rate: 0.04,
    startingRent: 2200, termYears: 15,
  })
  it('detects a configuration where the renter retakes the lead', () => {
    expect(multi.crossings.length).toBeGreaterThan(1)
  })
  // This is the case that used to be reported as a flat "pulls ahead in year
  // 5.3": the buyer leads from 5.3, the renter retakes the lead at 23.3 and
  // holds it for the remaining 27 years.
  it('reports no settled lead when the renter takes it back for good', () => {
    expect(multi.breakevenMonth).not.toBeNull()
    expect(multi.settledAheadMonth).toBeNull()
  })
  it('is ahead between the crossings and behind after the last one', () => {
    const [first, last] = [multi.crossings[0], multi.crossings.at(-1)!]
    const mid = Math.round((first + last) / 2)
    expect(multi.rows[mid - 1].buyerNetWorth).toBeGreaterThan(multi.rows[mid - 1].renterNetWorth)
    expect(multi.rows.at(-1)!.buyerNetWorth).toBeLessThan(multi.rows.at(-1)!.renterNetWorth)
  })
  it('never reports settledAhead when the buyer ends behind', () => {
    const losing = simulateRentBuy({ ...FORT_MYERS, startingRent: 1800, insPct: 0.005 })
    expect(losing.settledAheadMonth).toBeNull()
  })
  it('always has settledAhead at or after the first crossing when both exist', () => {
    for (const p of [FORT_MYERS, NATIONAL]) {
      const r = simulateRentBuy(p)
      expect(r.settledAheadMonth!).toBeGreaterThanOrEqual(r.breakevenMonth!)
    }
  })
})
