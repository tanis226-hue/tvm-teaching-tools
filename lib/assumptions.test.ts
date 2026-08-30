import { describe, it, expect } from 'vitest'
import {
  INFLATION, RETURN_PRE, RETURN_POST, MORTGAGE_RATE,
  LIFE_EXPECTANCY, ESTATE_RESIDUAL, MONTHLY_INFLATION,
  monthlyRate, geometricMonthly,
} from './assumptions'

describe('locked class assumptions', () => {
  it('holds the values the spec publishes', () => {
    expect(INFLATION).toBe(0.025)
    expect(RETURN_PRE).toBe(0.075)
    expect(RETURN_POST).toBe(0.04)
    expect(MORTGAGE_RATE).toBe(0.0666)
    expect(LIFE_EXPECTANCY).toBe(85)
    expect(ESTATE_RESIDUAL).toBe(0.1)
  })

  it('uses APR/12 for returns', () => {
    expect(monthlyRate(0.075)).toBeCloseTo(0.00625, 10)
    expect(monthlyRate(0.04)).toBeCloseTo(0.0033333333, 9)
  })

  it('uses geometric monthly for inflation, not APR/12', () => {
    expect(MONTHLY_INFLATION).toBeCloseTo(0.0020598363, 9)
    expect(MONTHLY_INFLATION).not.toBeCloseTo(0.025 / 12, 6)
  })

  it('compounds geometric monthly back to the annual rate', () => {
    expect((1 + geometricMonthly(0.035)) ** 12 - 1).toBeCloseTo(0.035, 12)
  })
})
