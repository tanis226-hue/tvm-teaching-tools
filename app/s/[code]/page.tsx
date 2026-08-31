import { RetirementCalculator } from '@/components/RetirementCalculator'

// The in-class version: same calculator, plus the ability to submit to the
// session on the projector.
export default async function StudentPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  return <RetirementCalculator code={code} />
}
