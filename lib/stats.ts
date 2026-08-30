export function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
}

export const INCOME_BUCKETS = [0, 2000, 4000, 6000, 8000, 10000, 15000, 50000]

export function histogram(xs: number[], edges: number[]) {
  const buckets = edges.slice(0, -1).map((lo, idx) => ({
    label: idx === edges.length - 2 ? `${lo / 1000}k+` : `${lo / 1000}-${edges[idx + 1] / 1000}k`,
    count: 0,
  }))
  for (const x of xs) {
    let idx = edges.findIndex((lo, i) => i < edges.length - 1 && x >= lo && x < edges[i + 1])
    if (idx === -1) idx = buckets.length - 1
    buckets[idx].count++
  }
  return buckets
}
