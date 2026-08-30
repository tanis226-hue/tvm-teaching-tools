import { describe, it, expect } from 'vitest'
import { median, histogram, INCOME_BUCKETS } from './stats'

describe('median', () => {
  it('averages the middle pair for an even count', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })
  it('takes the middle for an odd count', () => {
    expect(median([5, 1, 3])).toBe(3)
  })
  it('returns 0 for an empty set', () => {
    expect(median([])).toBe(0)
  })
  it('does not mutate its input', () => {
    const xs = [3, 1, 2]
    median(xs)
    expect(xs).toEqual([3, 1, 2])
  })
})

describe('histogram', () => {
  it('counts values into half-open buckets', () => {
    const h = histogram([1000, 2000, 2500, 9000], [0, 2000, 5000, 10000])
    expect(h.map(b => b.count)).toEqual([1, 2, 1])
  })
  it('puts values at or above the last edge into the final bucket', () => {
    const h = histogram([12000], [0, 2000, 5000, 10000])
    expect(h.at(-1)!.count).toBe(1)
  })
  it('covers the full spec income range', () => {
    expect(INCOME_BUCKETS[0]).toBeLessThanOrEqual(500)
    expect(INCOME_BUCKETS.at(-1)).toBeGreaterThanOrEqual(50000)
  })
})
