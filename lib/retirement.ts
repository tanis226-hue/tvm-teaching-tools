import {
  INFLATION, RETURN_PRE, RETURN_POST, LIFE_EXPECTANCY,
  ESTATE_RESIDUAL, MONTHLY_INFLATION, monthlyRate,
} from './assumptions'

export type RetirementInput = {
  currentAge: number
  retirementAge: number
  desiredMonthlyIncome: number
  matchRate?: number
}

export type RetirementResult = {
  firstWithdrawal: number
  lumpSum: number
  firstContribution: number
  finalContribution: number
  totalContributed: number
  personalContribution: number
  employerContribution: number
  monthsSaving: number
  monthsDrawing: number
}

const ip = monthlyRate(RETURN_PRE)
const i = monthlyRate(RETURN_POST)
const g = MONTHLY_INFLATION

function validate({ currentAge, retirementAge }: RetirementInput) {
  if (retirementAge <= currentAge) {
    throw new Error('Retirement age must be greater than current age')
  }
  if (retirementAge >= LIFE_EXPECTANCY) {
    throw new Error('Retirement age must be below life expectancy')
  }
  // The growing-annuity formulas divide by (i - g) and (ip - g). Locked rates
  // make this safe; the guard exists because editable rates would divide by
  // zero silently and put Infinity on a projector.
  if (i === g || ip === g) {
    throw new Error('Return rate must differ from the growth rate')
  }
}

export function solveRetirement(input: RetirementInput): RetirementResult {
  validate(input)
  const { currentAge, retirementAge, desiredMonthlyIncome, matchRate = 0 } = input

  const yearsSaving = retirementAge - currentAge
  const yearsDrawing = LIFE_EXPECTANCY - retirementAge
  const N = yearsSaving * 12
  const n = yearsDrawing * 12

  const firstWithdrawal = desiredMonthlyIncome * (1 + INFLATION) ** yearsSaving

  const pv = (firstWithdrawal / (i - g)) * (1 - ((1 + g) / (1 + i)) ** n)
  const lumpSum = pv / (1 - ESTATE_RESIDUAL / (1 + i) ** n)

  const fvFactor = ((1 + ip) ** N - (1 + g) ** N) / (ip - g)
  const firstContribution = lumpSum / fvFactor

  const finalContribution = firstContribution * (1 + g) ** (N - 1)
  const totalContributed = (firstContribution * ((1 + g) ** N - 1)) / g

  const personalContribution = firstContribution / (1 + matchRate)

  return {
    firstWithdrawal,
    lumpSum,
    firstContribution,
    finalContribution,
    totalContributed,
    personalContribution,
    employerContribution: firstContribution - personalContribution,
    monthsSaving: N,
    monthsDrawing: n,
  }
}

export function accumulationSeries(input: RetirementInput) {
  const { firstContribution, monthsSaving } = solveRetirement(input)
  const out = []
  let balance = 0
  let contributed = 0

  for (let m = 1; m <= monthsSaving; m++) {
    const payment = firstContribution * (1 + g) ** (m - 1)
    balance = balance * (1 + ip) + payment
    contributed += payment
    out.push({
      month: m,
      age: input.currentAge + m / 12,
      balance,
      contributed,
      growth: balance - contributed,
    })
  }
  return out
}

export function drawdownSeries(input: RetirementInput) {
  const { lumpSum, firstWithdrawal, monthsDrawing } = solveRetirement(input)
  const out = []
  let balance = lumpSum

  for (let m = 1; m <= monthsDrawing; m++) {
    const withdrawal = firstWithdrawal * (1 + g) ** (m - 1)
    balance = balance * (1 + i) - withdrawal
    out.push({
      month: m,
      age: input.retirementAge + m / 12,
      balance: Math.max(0, balance),
      withdrawal,
    })
  }
  return out
}

export function costOfWaiting(input: RetirementInput, startAges: number[]) {
  return startAges
    .filter(startAge => startAge < input.retirementAge)
    .map(startAge => ({
      startAge,
      contribution: solveRetirement({ ...input, currentAge: startAge }).firstContribution,
    }))
}

export function purchasingPowerSeries(fromAge: number, toAge: number) {
  const out = []
  for (let age = fromAge; age <= toAge; age++) {
    out.push({ age, value: 1 / (1 + INFLATION) ** (age - fromAge) })
  }
  return out
}

export function toTodaysDollars(nominal: number, yearsFromNow: number): number {
  return nominal / (1 + INFLATION) ** yearsFromNow
}
