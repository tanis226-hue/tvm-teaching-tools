import { ASSUMPTION_LABELS, INFLATION } from '@/lib/assumptions'

export function AssumptionsPanel() {
  return (
    <section className="rounded-2xl border-l-4 border-accent bg-accent-tint p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-700">Class assumptions</h2>
      <p className="mt-1 text-xs text-slate-500">
        Locked so everyone&apos;s answers are comparable. Returns use APR &divide; 12;
        inflation compounds monthly at ({(1 + INFLATION).toFixed(3)})<sup>1/12</sup> &minus; 1.
      </p>
      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
        {ASSUMPTION_LABELS.map(a => (
          <div key={a.label} className="flex justify-between gap-4 border-b border-slate-200 py-1">
            <dt className="text-sm text-slate-600">{a.label}</dt>
            <dd className="text-sm font-medium tabular-nums text-slate-900">{a.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
