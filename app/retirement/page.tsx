import type { Metadata } from 'next'
import { RetirementCalculator } from '@/components/RetirementCalculator'
import { SiteHeader } from '@/components/SiteHeader'

export const metadata: Metadata = {
  title: 'Retirement calculator',
  description:
    'Work out what retirement costs and what you would need to save each month. No sign-in, nothing saved.',
}

// The practice version. Same component as the in-class route, so the numbers a
// student sees here are identical to the ones from the lecture.
export default function RetirementPracticePage() {
  return (
    <>
      <SiteHeader />
      <RetirementCalculator />
    </>
  )
}
