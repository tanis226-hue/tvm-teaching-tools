export function ChartFrame({
  title, note, children,
}: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
      <div className="mt-3 h-56 w-full">{children}</div>
    </section>
  )
}
