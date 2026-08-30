import { usd } from '@/lib/format'

export function ResultCard({
  label, nominal, todaysDollars, emphasis = 'normal', caption,
}: {
  label: string; nominal: number; todaysDollars?: number
  emphasis?: 'hero' | 'normal'; caption?: string
}) {
  const hero = emphasis === 'hero'
  return (
    <div className={`rounded-2xl border p-5 ${hero ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white'}`}>
      <p className={`text-sm font-medium ${hero ? 'text-slate-300' : 'text-slate-500'}`}>{label}</p>
      <p className={`mt-1 font-semibold tabular-nums ${hero ? 'text-4xl' : 'text-2xl'}`}>{usd(nominal)}</p>
      {todaysDollars !== undefined && (
        <p className={`mt-1 text-sm tabular-nums ${hero ? 'text-slate-300' : 'text-slate-500'}`}>
          {usd(todaysDollars)} in today&apos;s dollars
        </p>
      )}
      {caption && (
        <p className={`mt-2 text-sm ${hero ? 'text-slate-300' : 'text-slate-500'}`}>{caption}</p>
      )}
    </div>
  )
}
