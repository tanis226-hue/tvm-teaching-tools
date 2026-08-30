const money = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
})

export function usd(n: number): string {
  return money.format(Math.round(n))
}

export function pct(n: number): string {
  return `${(n * 100).toFixed((n * 100) % 1 === 0 ? 1 : 2)}%`
}
