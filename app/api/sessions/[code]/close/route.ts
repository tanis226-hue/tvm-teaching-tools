import { NextResponse } from 'next/server'
import { closeSession } from '@/lib/db'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const { instructorToken } = await req.json()
  if (typeof instructorToken !== 'string') {
    return NextResponse.json({ error: 'Missing instructor token' }, { status: 400 })
  }
  const ok = await closeSession(code, instructorToken)
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: 'Not authorized' }, { status: 403 })
}
