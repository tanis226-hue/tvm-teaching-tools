import { NextResponse } from 'next/server'
import { getSession, upsertSubmission } from '@/lib/db'
import { solveRetirement } from '@/lib/retirement'
import { submissionSchema } from '@/lib/validation'

export async function POST(req: Request) {
  const parsed = submissionSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid submission' },
      { status: 400 },
    )
  }
  const d = parsed.data

  const session = await getSession(d.code)
  if (!session) return NextResponse.json({ error: 'Unknown session code' }, { status: 404 })
  if (session.closed_at) {
    return NextResponse.json({ error: 'This session is closed' }, { status: 409 })
  }

  // Recomputed server-side rather than trusted from the client. The route runs
  // in Node and imports the solver directly, so this costs one function call
  // rather than a duplicated implementation.
  const r = solveRetirement({
    currentAge: d.currentAge,
    retirementAge: d.retirementAge,
    desiredMonthlyIncome: d.desiredIncome,
    matchRate: d.matchRate,
  })

  await upsertSubmission({
    sessionId: session.id,
    deviceHash: d.deviceHash,
    currentAge: d.currentAge,
    retirementAge: d.retirementAge,
    desiredIncome: d.desiredIncome,
    matchRate: d.matchRate,
    firstWithdrawal: r.firstWithdrawal,
    lumpSum: r.lumpSum,
    firstContribution: r.firstContribution,
  })

  return NextResponse.json({ ok: true })
}
