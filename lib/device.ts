// Identifies a browser, not a person. A student who clears storage or switches
// phones can submit again; that ceiling is acceptable for a classroom poll and
// keeps the anonymity claim literally true.
export function getDeviceHash(code: string): string {
  const key = 'tvm-device-id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return `${code}:${id}`
}
