export const INFLATION = 0.03
export const RETURN_PRE = 0.075
export const RETURN_POST = 0.04
export const MORTGAGE_RATE = 0.0665
export const LIFE_EXPECTANCY = 85
export const ESTATE_RESIDUAL = 0.1

export function monthlyRate(annual: number): number {
  return annual / 12
}

export function geometricMonthly(annual: number): number {
  return (1 + annual) ** (1 / 12) - 1
}

export const MONTHLY_INFLATION = geometricMonthly(INFLATION)

export const ASSUMPTION_LABELS = [
  { label: 'Inflation', value: '3.0%', note: 'Conventional teaching figure' },
  { label: 'Return before retirement', value: '7.5%', note: 'Diversified equity-weighted portfolio' },
  { label: 'Return during retirement', value: '4.0%', note: '1-year Treasury, verified Aug 2026' },
  { label: 'Life expectancy', value: '85', note: 'Fixed, so drawdown falls out of retirement age' },
  { label: 'Estate residual at 85', value: '10%', note: 'Pot does not run to exactly zero' },
  { label: 'Withdrawals grow at', value: '3.0%/yr', note: 'Purchasing power maintained' },
  { label: 'Contributions grow at', value: '3.0%/yr', note: 'Step up with salary' },
] as const
