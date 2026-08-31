'use client'

export function NumberField({
  label, value, min, max, step = 1, suffix, onChange,
}: {
  label: string; value: number; min: number; max: number
  step?: number; suffix?: string; onChange: (n: number) => void
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <div className="mt-1 flex items-center gap-3">
        <input
          type="number" inputMode="numeric" value={value} min={min} max={max} step={step}
          onChange={e => onChange(Number(e.target.value))}
          onBlur={e => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
          className="w-full rounded-lg border border-slate-400 bg-white px-3 py-3 text-lg font-semibold tabular-nums text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        {suffix && <span className="text-sm text-slate-500">{suffix}</span>}
      </div>
      <input
        type="range" value={value} min={min} max={max} step={step}
        onChange={e => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-brand"
      />
    </label>
  )
}
