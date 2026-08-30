'use client'

import { useState } from 'react'
import QRCode from 'qrcode'

export default function InstructorPage() {
  const [code, setCode] = useState('')
  const [qr, setQr] = useState('')
  const [error, setError] = useState('')

  async function start() {
    setError('')
    const res = await fetch('/api/sessions', { method: 'POST' })
    if (!res.ok) {
      setError((await res.json()).error ?? 'Could not start a session')
      return
    }
    const started = await res.json()
    setCode(started.code)
    setQr(await QRCode.toDataURL(`${location.origin}/s/${started.code}`, { width: 640, margin: 1 }))
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-center">
      <h1 className="text-4xl font-bold text-slate-900">Retirement calculator</h1>
      {!code ? (
        <>
          <button
            onClick={start}
            className="mt-8 rounded-xl bg-slate-900 px-8 py-4 text-xl font-semibold text-white"
          >
            Start a class session
          </button>
          {error && <p className="mt-4 text-red-600">{error}</p>}
        </>
      ) : (
        <div className="mt-8 space-y-6">
          <p className="text-2xl text-slate-600">Scan to join</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="" className="mx-auto w-80" />
          <p className="font-mono text-7xl font-bold tracking-widest text-slate-900">{code}</p>
          <a
            href={`/d/${code}`}
            className="inline-block rounded-xl border-2 border-slate-900 px-6 py-3 text-lg font-semibold"
          >
            Open the results dashboard
          </a>
        </div>
      )}
    </main>
  )
}
