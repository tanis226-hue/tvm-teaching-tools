export function ChartFrame({
  title,
  note,
  projector = false,
  children,
}: {
  title: string
  note?: string
  // Module 1 renders this on a 375px phone, Module 2 on a lecture-hall
  // projector. Defaults stay phone-sized; Module 2 opts in.
  projector?: boolean
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className={projector ? 'text-lg font-semibold text-slate-800' : 'text-sm font-semibold text-slate-700'}>
        {title}
      </h2>
      {note && (
        <p className={projector ? 'mt-1 text-sm text-slate-600' : 'mt-1 text-xs text-slate-600'}>
          {note}
        </p>
      )}
      <div className={projector ? 'mt-3 h-[38vh] min-h-64 w-full' : 'mt-3 h-56 w-full'}>
        {children}
      </div>
    </section>
  )
}
