export function Callout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-l-4 border-amber-500 bg-amber-50 p-5 shadow-sm">
      <h3 className="text-lg font-bold text-amber-900">{title}</h3>
      <p className="mt-1 text-base leading-relaxed text-amber-900/80">{children}</p>
    </div>
  )
}
