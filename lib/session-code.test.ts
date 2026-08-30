import { describe, it, expect } from 'vitest'
import { generateSessionCode, SESSION_CODE_ALPHABET } from './session-code'

describe('session codes', () => {
  it('is six characters', () => {
    expect(generateSessionCode()).toHaveLength(6)
  })

  it('excludes glyphs that are ambiguous on a projector', () => {
    for (const bad of ['0', 'O', '1', 'I', 'L']) {
      expect(SESSION_CODE_ALPHABET).not.toContain(bad)
    }
  })

  it('draws only from the published alphabet', () => {
    for (let n = 0; n < 500; n++) {
      for (const ch of generateSessionCode()) {
        expect(SESSION_CODE_ALPHABET).toContain(ch)
      }
    }
  })

  it('does not obviously repeat', () => {
    const seen = new Set(Array.from({ length: 500 }, () => generateSessionCode()))
    expect(seen.size).toBeGreaterThan(495)
  })
})
