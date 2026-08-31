'use client'
import { useState } from 'react'

export function FormulaToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-sm font-medium text-brand underline underline-offset-4"
      >
        {open ? 'Hide the formula' : 'Show the formula'}
      </button>
      {open && (
        <div className="mt-3 overflow-x-auto font-mono text-xs leading-relaxed text-slate-700">
          {children}
        </div>
      )}
    </div>
  )
}
