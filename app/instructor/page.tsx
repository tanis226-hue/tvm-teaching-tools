'use client'

import { useState } from 'react'
import QRCode from 'qrcode'

// The dashboard needs this to reach the close endpoint. sessionStorage, never
// the URL: the dashboard URL goes on a projector and into Netlify's logs.
export const instructorTokenKey = (code: string) => `tvm-instr-${code}`

export default function InstructorPage() {
  const [code, setCode] = useState('')
  const [qr, setQr] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function start() {
    if (pending) return
    setPending(true)
    setError('')
    try {
      const res = await fetch('/api/sessions', { method: 'POST' })
      const body = await res.json().catch(() => null)
      if (!res.ok || !body?.code) {
        setError(body?.error ?? `Could not start a session (${res.status})`)
        return
      }
      // Build the QR before committing the code, so a double-click can never
      // project session B's code above session A's QR.
      const dataUrl = await QRCode.toDataURL(`${location.origin}/s/${body.code}`, {
        width: 640,
        margin: 1,
      })
      try {
        sessionStorage.setItem(instructorTokenKey(body.code), body.instructorToken)
      } catch {
        // Private mode. The session still works; only the close button is lost.
      }
      setQr(dataUrl)
      setCode(body.code)
    } catch {
      setError('Could not reach the server')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-center">
      <h1 className="text-4xl font-bold text-slate-900">Retirement calculator</h1>
      {!code ? (
        <>
          <button
            onClick={start}
            disabled={pending}
            className="mt-8 rounded-xl bg-brand px-8 py-4 text-xl font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:bg-slate-400"
          >
            {pending ? 'Starting...' : 'Start a class session'}
          </button>
          {error && <p className="mt-4 text-red-600">{error}</p>}
        </>
      ) : (
        <div className="mt-8 space-y-6">
          <p className="text-2xl text-slate-600">Scan to join</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="" className="mx-auto w-80" />
          <p className="font-mono text-7xl font-bold tracking-widest text-brand">{code}</p>
          <a
            href={`/d/${code}`}
            className="inline-block rounded-xl border-2 border-brand px-6 py-3 text-lg font-semibold text-brand transition-colors hover:bg-brand-tint"
          >
            Open the results dashboard
          </a>
          <p className="text-sm text-slate-500">
            Keep this tab open. The dashboard&apos;s close-session button needs it.
          </p>
        </div>
      )}
    </main>
  )
}
