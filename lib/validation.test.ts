import { describe, it, expect } from 'vitest'
import { submissionSchema, normalizeSessionLabel, MAX_SESSION_LABEL } from './validation'

const valid = {
  code: 'A2B3C4', deviceHash: 'abc12345', currentAge: 20,
  retirementAge: 65, desiredIncome: 5000, matchRate: 0,
}

describe('submission validation', () => {
  it('accepts a well-formed submission', () => {
    expect(submissionSchema.safeParse(valid).success).toBe(true)
  })

  it.each([
    ['current age below 16', { currentAge: 15 }],
    ['current age above 70', { currentAge: 71 }],
    ['retirement age below 45', { retirementAge: 44 }],
    ['retirement age above 80', { retirementAge: 81 }],
    ['income below $500', { desiredIncome: 499 }],
    ['income above $50,000', { desiredIncome: 50001 }],
    ['match rate above 1', { matchRate: 1.5 }],
    ['negative match rate', { matchRate: -0.1 }],
  ])('rejects %s', (_label, patch) => {
    expect(submissionSchema.safeParse({ ...valid, ...patch }).success).toBe(false)
  })

  it('rejects a retirement age at or below the current age', () => {
    expect(submissionSchema.safeParse({ ...valid, currentAge: 65, retirementAge: 65 }).success).toBe(false)
  })

  it('uppercases the session code', () => {
    expect(submissionSchema.parse({ ...valid, code: 'a2b3c4' }).code).toBe('A2B3C4')
  })

  it('carries no field that could hold PII', () => {
    const keys = Object.keys(submissionSchema.parse(valid))
    for (const banned of ['name', 'email', 'studentId', 'ip']) {
      expect(keys).not.toContain(banned)
    }
  })
})

describe('normalizeSessionLabel', () => {
  it('keeps an ordinary class name', () => {
    expect(normalizeSessionLabel('MAT 1033, Prof. Rivera')).toBe('MAT 1033, Prof. Rivera')
  })

  it('treats blank and non-string input as absent', () => {
    expect(normalizeSessionLabel('   ')).toBeNull()
    expect(normalizeSessionLabel(undefined)).toBeNull()
    expect(normalizeSessionLabel(42)).toBeNull()
  })

  // A pasted multi-line name would otherwise push the projector header open.
  it('collapses newlines, tabs and control characters to single spaces', () => {
    expect(normalizeSessionLabel('Fall\n\tTerm\u0000\u007F 2026')).toBe('Fall Term 2026')
  })

  it('caps the length so a long name cannot crowd out the page', () => {
    const out = normalizeSessionLabel('x'.repeat(500))
    expect(out).toHaveLength(MAX_SESSION_LABEL)
  })
})
