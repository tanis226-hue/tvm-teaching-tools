import { RETURN_PRE, MORTGAGE_RATE, geometricMonthly, monthlyRate } from './assumptions'

export type RentBuyInput = {
  price: number
  downPct: number
  rate: number
  termYears: number
  closingBuyPct: number
  closingSellPct: number
  taxPct: number
  maintPct: number
  insPct: number
  hoaMonthly: number
  apprPct: number
  pmiPct: number
  startingRent: number
  rentIncreasePct: number
  rentersInsMonthly: number
  investReturn: number
}

export type MonthRow = {
  month: number
  pi: number
  principal: number
  interest: number
  pmi: number
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
  breakevenMonth: number | null
  outlayCrossingMonth: number | null
  totalInterest: number
  rows: MonthRow[]
}

const HORIZON_MONTHS = 360

export function simulateRentBuy(input: RentBuyInput): RentBuyResult {
  const r = monthlyRate(input.rate)
  const N = input.termYears * 12
  const retM = monthlyRate(input.investReturn)
  const apprM = geometricMonthly(input.apprPct)
  const rentM = geometricMonthly(input.rentIncreasePct)

  let balance = input.price * (1 - input.downPct)
  const monthlyPI = r === 0 ? balance / N : (balance * r) / (1 - (1 + r) ** -N)
  const upfront = input.price * input.downPct + input.price * input.closingBuyPct

  let homeValue = input.price
  let buyerInvest = 0
  let renterInvest = upfront
  let totalInterest = 0
  let breakevenMonth: number | null = null
  let outlayCrossingMonth: number | null = null
  const rows: MonthRow[] = []

  for (let m = 1; m <= HORIZON_MONTHS; m++) {
    const active = m <= N && balance > 0
    const interest = active ? balance * r : 0
    const principal = active ? Math.min(monthlyPI - interest, balance) : 0
    const pi = active ? monthlyPI : 0

    balance = Math.max(0, balance - principal)
    totalInterest += interest
    homeValue *= 1 + apprM

    const pmi = balance / homeValue > 0.8 ? (balance * input.pmiPct) / 12 : 0
    const carrying = (homeValue * (input.taxPct + input.maintPct + input.insPct)) / 12
    const buyerOutlay = pi + carrying + input.hoaMonthly + pmi

    const rent = input.startingRent * (1 + rentM) ** (m - 1)
    const renterOutlay = rent + input.rentersInsMonthly

    buyerInvest *= 1 + retM
    renterInvest *= 1 + retM
    const diff = renterOutlay - buyerOutlay
    if (diff > 0) buyerInvest += diff
    else renterInvest += -diff

    const equity = homeValue - balance
    const buyerNetWorth = homeValue - balance - homeValue * input.closingSellPct + buyerInvest
    const renterNetWorth = renterInvest

    if (breakevenMonth === null && buyerNetWorth > renterNetWorth) breakevenMonth = m
    if (outlayCrossingMonth === null && renterOutlay > buyerOutlay) outlayCrossingMonth = m

    rows.push({
      month: m, pi, principal, interest, pmi, rent,
      buyerOutlay, renterOutlay, homeValue, balance, equity,
      buyerNetWorth, renterNetWorth,
    })
  }

  return { monthlyPI, upfront, breakevenMonth, outlayCrossingMonth, totalInterest, rows }
}

const SHARED = {
  price: 350_000,
  downPct: 0.2,
  rate: MORTGAGE_RATE,
  termYears: 30,
  closingBuyPct: 0.03,
  closingSellPct: 0.06,
  taxPct: 0.011,
  maintPct: 0.01,
  hoaMonthly: 0,
  apprPct: 0.035,
  pmiPct: 0.005,
  rentIncreasePct: 0.03,
  rentersInsMonthly: 15,
  investReturn: RETURN_PRE,
}

export const FORT_MYERS: RentBuyInput = { ...SHARED, insPct: 0.014, startingRent: 2500 }
export const NATIONAL: RentBuyInput = { ...SHARED, insPct: 0.005, startingRent: 2200 }

export const PRESETS = { fortMyers: FORT_MYERS, national: NATIONAL } as const
export const DOWN_PAYMENT_PRESETS = [0.035, 0.05, 0.1, 0.2] as const
