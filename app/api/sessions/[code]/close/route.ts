import { NextResponse } from 'next/server'
import { closeSession } from '@/lib/db'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const instructorToken = (body as { instructorToken?: unknown })?.instructorToken
  if (typeof instructorToken !== 'string') {
    return NextResponse.json({ error: 'Missing instructor token' }, { status: 400 })
  }

  try {
    const ok = await closeSession(code, instructorToken)
    return ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
