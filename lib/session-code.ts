// Students read these off a projector, so 0/O and 1/I/L are excluded.
export const SESSION_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

export function generateSessionCode(length = 6): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (const b of bytes) out += SESSION_CODE_ALPHABET[b % SESSION_CODE_ALPHABET.length]
  return out
}
