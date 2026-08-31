import {
  RETURN_PRE, MORTGAGE_RATE, MORTGAGE_RATE_15, INFLATION, MONTHLY_INFLATION,
  geometricMonthly, monthlyRate,
} from './assumptions'

export type TaxMode = 'florida' | 'flat'

export type RentBuyInput = {
  price: number
  downPct: number
  rate: number
  termYears: number
  closingBuyPct: number
  /** Applied to the APPRECIATED sale price. Commission is a real future transaction. */
  closingSellPct: number
  taxMode: TaxMode
  /** Flat effective rate on market value. Used only when taxMode is 'flat'. */
  taxPct: number
  /**
   * Year-1 DOLLARS, grown at inflation. Never a percentage of market value:
   * roughly 40% of a home's value is land (FHFA, 2022), which needs no roof and
   * no premium, and charging upkeep on an appreciating value made higher
   * appreciation reduce the buyer's net worth.
   */
  maintAnnual: number
  insAnnual: number
  /** Zero means "not in a flood zone". No separate toggle: one fact, one field. */
  floodAnnual: number
  hoaMonthly: number
  apprPct: number
  /** % of the ORIGINAL loan amount per year, not the declining balance. */
  pmiPct: number
  startingRent: number
  rentIncreasePct: number
  rentersInsMonthly: number
  investReturn: number
  /**
   * What the household can put toward housing AND saving each month, in year-1
   * dollars, growing with inflation. Both paths spend their housing costs out
   * of this and invest the remainder, which is what keeps the renter's outcome
   * independent of the buyer's costs. Defaults to the buyer's month-1 outlay at
   * each preset rounded up to a round number, so the preset is affordable with
   * a little slack rather than sitting exactly on the edge, where a single
   * slider step would trip the over-budget warning.
   */
  monthlyBudget: number
}

export type MonthRow = {
  month: number
  pi: number
  principal: number
  interest: number
  pmi: number
  tax: number
  upkeep: number
  rent: number
  buyerOutlay: number
  renterOutlay: number
  homeValue: number
  balance: number
  equity: number
  buyerNetWorth: number
  renterNetWorth: number
}

export type RentBuyResult = {
  monthlyPI: number
  upfront: number
  /** First month the buyer's net worth exceeds the renter's. */
  breakevenMonth: number | null
  /**
   * Every month the lead changes hands. In 3.7% of slider configurations the
   * paths cross more than once, and reporting only `breakevenMonth` announced
   * "buying pulls ahead in year 5.2" for a case where the renter retook the
   * lead at year 16.6 and kept it.
   */
  crossings: number[]
  /** Month after which the buyer leads for the rest of the horizon, if ever. */
  settledAheadMonth: number | null
  outlayCrossingMonth: number | null
  totalInterest: number
  totalPmi: number
  /** Months the buyer's outlay exceeds the household budget, i.e. is unaffordable. */
  monthsOverBudget: number
  rows: MonthRow[]
}

// 50 years, not 30. The mortgage is gone at year 30 while rent keeps
// compounding, and that divergence is the whole back half of the lesson.
const HORIZON_MONTHS = 600
export const HORIZON_YEARS = HORIZON_MONTHS / 12

/** Lee County, FL. LeePA 2025 Taxing District Millage Book, county median district. */
export const FL_TAX = {
  millageSchool: 0.005319,
  millageNonSchool: 0.0093385,
  /** Applies to all levies. Not indexed. */
  exempt1: 25_000,
  /** Non-school levies only. CPI-indexed; $26,411 for 2026 (Amendment 5). */
  exempt2: 26_411,
  /** Save Our Homes: assessed value grows at min(CPI, 3%). */
  capPct: 0.03,
} as const

/** Automatic PMI termination, Homeowners Protection Act 1998, 12 U.S.C. 4901. */
const PMI_TERMINATION_LTV = 0.78

export function simulateRentBuy(input: RentBuyInput): RentBuyResult {
  const r = monthlyRate(input.rate)
  const N = input.termYears * 12
  const retM = monthlyRate(input.investReturn)
  const apprM = geometricMonthly(input.apprPct)
  const rentM = geometricMonthly(input.rentIncreasePct)
  const inflM = MONTHLY_INFLATION
  const soHCap = Math.min(INFLATION, FL_TAX.capPct)

  const originalLoan = input.price * (1 - input.downPct)
  let balance = originalLoan
  const monthlyPI = r === 0 ? balance / N : (balance * r) / (1 - (1 + r) ** -N)
  const upfront = input.price * input.downPct + input.price * input.closingBuyPct

  // Year-1 dollar costs, grown at inflation. Not rates on a compounding value.
  const upkeepBase =
    (input.maintAnnual + input.insAnnual + input.floodAnnual) / 12

  let homeValue = input.price
  let assessed = input.price // a sale resets assessed value to just value
  let buyerInvest = 0
  let renterInvest = upfront
  let totalInterest = 0
  let totalPmi = 0
  let monthsOverBudget = 0
  let breakevenMonth: number | null = null
  let outlayCrossingMonth: number | null = null
  const crossings: number[] = []
  let prevAhead: boolean | null = null
  const rows: MonthRow[] = []

  for (let m = 1; m <= HORIZON_MONTHS; m++) {
    const active = m <= N && balance > 0
    const interest = active ? balance * r : 0
    const principal = active ? Math.min(monthlyPI - interest, balance) : 0
    const pi = active ? monthlyPI : 0

    balance = Math.max(0, balance - principal)
    totalInterest += interest
    homeValue *= 1 + apprM

    // Save Our Homes caps the ASSESSED value, so the effective rate on market
    // value falls over a long hold. A flat rate cannot represent that: the
    // year-1 to year-50 spread is about 1.8x.
    let tax: number
    if (input.taxMode === 'florida') {
      if (m % 12 === 1 && m > 1) assessed = Math.min(assessed * (1 + soHCap), homeValue)
      const exempt2 = FL_TAX.exempt2 * (1 + INFLATION) ** Math.floor((m - 1) / 12)
      const schoolBase = Math.max(0, assessed - FL_TAX.exempt1)
      const nonSchoolBase = Math.max(0, assessed - FL_TAX.exempt1 - exempt2)
      tax = (schoolBase * FL_TAX.millageSchool + nonSchoolBase * FL_TAX.millageNonSchool) / 12
    } else {
      tax = (homeValue * input.taxPct) / 12
    }

    const inflator = (1 + inflM) ** (m - 1)
    const upkeep = upkeepBase * inflator
    const hoa = input.hoaMonthly * inflator

    // On the ORIGINAL loan amount, terminating against the ORIGINAL price.
    // Appreciation does not end PMI early.
    const pmiApplies = input.downPct < 0.2 && balance / input.price > PMI_TERMINATION_LTV
    const pmi = pmiApplies ? (originalLoan * input.pmiPct) / 12 : 0
    totalPmi += pmi

    const buyerOutlay = pi + tax + upkeep + hoa + pmi

    const rent = input.startingRent * (1 + rentM) ** (m - 1)
    const renterOutlay = rent + input.rentersInsMonthly * inflator

    // Each household has the same budget for housing plus saving, and saves
    // whatever it does not spend on housing.
    //
    // The previous rule gave the renter `buyerOutlay - renterOutlay`, which
    // made the household budget a function of the BUYER's costs. Raising any
    // buyer cost then handed the renter cash: an $800/mo HOA on a house the
    // renter does not live in made them $5.2M richer by year 50, and a 10%
    // mortgage rate left them 3.5x wealthier than a 4% one. Anchoring the
    // budget breaks that causal link, so the renter's outcome now depends only
    // on renter-side inputs.
    const budget = input.monthlyBudget * inflator
    if (buyerOutlay > budget) monthsOverBudget++
    buyerInvest = buyerInvest * (1 + retM) + (budget - buyerOutlay)
    renterInvest = renterInvest * (1 + retM) + (budget - renterOutlay)

    const equity = homeValue - balance
    const buyerNetWorth = homeValue - balance - homeValue * input.closingSellPct + buyerInvest
    const renterNetWorth = renterInvest

    const ahead = buyerNetWorth > renterNetWorth
    if (breakevenMonth === null && ahead) breakevenMonth = m
    if (prevAhead !== null && ahead !== prevAhead) crossings.push(m)
    prevAhead = ahead
    if (outlayCrossingMonth === null && renterOutlay > buyerOutlay) outlayCrossingMonth = m

    rows.push({
      month: m, pi, principal, interest, pmi, tax, upkeep, rent,
      buyerOutlay, renterOutlay, homeValue, balance, equity,
      buyerNetWorth, renterNetWorth,
    })
  }

  // Walk back from the end: the buyer "settles ahead" at the month after the
  // last time they were behind.
  let settledAheadMonth: number | null = null
  for (let idx = rows.length - 1; idx >= 0; idx--) {
    if (rows[idx].buyerNetWorth <= rows[idx].renterNetWorth) break
    settledAheadMonth = rows[idx].month
  }

  return {
    monthlyPI, upfront, breakevenMonth, crossings, settledAheadMonth,
    outlayCrossingMonth, totalInterest, totalPmi, monthsOverBudget, rows,
  }
}

const SHARED = {
  downPct: 0.1, // NAR 2025 median first-time buyer, highest since 1989
  rate: MORTGAGE_RATE,
  termYears: 30,
  closingBuyPct: 0.02, // excludes prepaids and escrow, which are charged annually
  hoaMonthly: 0,
  apprPct: 0.0375, // inflation + 1.25pp real; FHFA long-run real is 1.26%
  pmiPct: 0.0038, // Enact national BPMI card, 90-85% LTV, FICO 740-759
  rentIncreasePct: 0.0325, // BLS rent of primary residence, ~0.9pp over CPI
  investReturn: RETURN_PRE,
}

export const FORT_MYERS: RentBuyInput = {
  ...SHARED,
  price: 385_000, // Lee County median SF sale, Florida Realtors via FGCU RERI, Jul 2026
  closingSellPct: 0.067, // 5.25% commission + FL deed stamps 0.70% + title 0.52%
  taxMode: 'florida',
  // Unused while taxMode is 'florida'; kept as the flat-rate equivalent so the
  // field is not carrying a wrong number if the mode is ever switched. 1.31% is
  // what the homestead calculation actually produces in year 1.
  taxPct: 0.0131,
  maintAnnual: 4_200, // JCHS 2025 (2023 AHS) uprated to 2026, +10% SW-FL premium
  insAnnual: 3_576, // FLOIR Property Insurance Stability Report, Jul 2026, Lee County
  floodAnnual: 1_975, // FEMA NFIP median, Lee County SFHA single-family; 74.7%
                      // of Lee County single-family NFIP policies are in an SFHA
  startingRent: 2_200, // Zillow ZORI SFR Cape Coral-Fort Myers, 2026-07-31
  rentersInsMonthly: 30,
  monthlyBudget: 3_600, // the buyer's month-1 outlay ($3,568) rounded up to a round number
}

export const NATIONAL: RentBuyInput = {
  ...SHARED,
  price: 400_000,
  closingSellPct: 0.07,
  taxMode: 'flat',
  // ATTOM 2025 Annual Property Tax Analysis reconciled with NAHB/ACS 2024. The
  // 0.90% headline is value-weighted and dominated by California under Prop 13;
  // the typical-home ratio is ~1.02%. 1.00% blends the two, and a buyer resets
  // to full market value on purchase in every assessment-cap state.
  taxPct: 0.01,
  maintAnnual: 4_100,
  // NAIC Homeowners Report (2023 data, pub. Jul 2026) HO-3 countrywide,
  // interpolated to $400,000 Coverage A = $1,638, trended to mid-2026 on
  // S&P Global approved rate changes = $2,014.
  insAnnual: 2_000,
  floodAnnual: 0, // ~3-5% of US households carry NFIP, so off by default
  startingRent: 2_300, // Zillow ZORI SFR US, 2026-07-31
  rentersInsMonthly: 25,
  monthlyBudget: 3_300, // the buyer's month-1 outlay ($3,270) rounded up to a round number
}

export const PRESETS = { fortMyers: FORT_MYERS, national: NATIONAL } as const
export const DOWN_PAYMENT_PRESETS = [0.035, 0.05, 0.1, 0.2] as const
export const TERM_RATES: Record<number, number> = { 15: MORTGAGE_RATE_15, 30: MORTGAGE_RATE }
