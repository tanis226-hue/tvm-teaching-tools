// Identifies a browser, not a person. A student who clears storage or switches
// phones can submit again; that ceiling is acceptable for a classroom poll and
// keeps the anonymity claim literally true.
export function getDeviceHash(code: string): string {
  // Per session, not per browser. A single global id would let anyone
  // correlate the same student's answers across every lecture of the term.
  const key = `tvm-device-id:${code}`
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return `${code}:${id}`
}
