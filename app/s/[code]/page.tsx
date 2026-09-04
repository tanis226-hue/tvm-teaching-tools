import { RetirementCalculator } from '@/components/RetirementCalculator'
import { SiteHeader } from '@/components/SiteHeader'
import { getSession } from '@/lib/db'

// The in-class version: same calculator, plus the ability to submit to the
// session on the projector.
export default async function StudentPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  // Only the header name depends on this. A database blip should cost the
  // class its branding, not its calculator, so an unreachable session falls
  // back to the default header and lets the submit path report the real error.
  const label = await getSession(code).then(s => s?.label ?? null).catch(() => null)
  return (
    <>
      <SiteHeader label={label} />
      <RetirementCalculator code={code} />
    </>
  )
}
