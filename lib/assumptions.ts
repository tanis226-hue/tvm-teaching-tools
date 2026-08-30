// 2.5%, not the conventional 3%. Realized CPI-U 1996-2026 is 2.56%, the
// Philadelphia Fed SPF Q3 2026 10-year expectation is 2.30%, and the FOMC
// targets 2% PCE. Every other rate in both modules is a spread over this, so
// changing it re-bases every published figure on purpose.
export const INFLATION = 0.025
export const RETURN_PRE = 0.075
export const RETURN_POST = 0.04
export const MORTGAGE_RATE = 0.0666      // Freddie Mac PMMS, week of 2026-08-27
export const MORTGAGE_RATE_15 = 0.0598   // same PMMS release
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
  { label: 'Inflation', value: '2.5%', note: 'CPI-U 1996-2026 realized 2.56%' },
  { label: 'Return before retirement', value: '7.5%', note: 'Diversified equity-weighted portfolio' },
  { label: 'Return during retirement', value: '4.0%', note: '1-year Treasury 4.04%, 2026-08-27' },
  { label: 'Life expectancy', value: '85', note: 'Fixed, so drawdown falls out of retirement age' },
  { label: 'Estate residual at 85', value: '10%', note: 'Pot does not run to exactly zero' },
  { label: 'Withdrawals grow at', value: '2.5%/yr', note: 'Purchasing power maintained' },
  { label: 'Contributions grow at', value: '2.5%/yr', note: 'Step up with salary' },
] as const
