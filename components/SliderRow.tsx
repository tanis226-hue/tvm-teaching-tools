'use client'

export function SliderRow({
  label, value, min, max, step, format, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number
  format: (n: number) => string; onChange: (n: number) => void
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="text-base text-slate-600">{label}</span>
        <span className="text-lg font-semibold tabular-nums text-slate-900">{format(value)}</span>
      </div>
      <input
        type="range" value={value} min={min} max={max} step={step}
        onChange={e => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-brand"
      />
    </label>
  )
}
