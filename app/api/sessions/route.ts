import { NextResponse } from 'next/server'
import { createSession } from '@/lib/db'
import { normalizeSessionLabel } from '@/lib/validation'

export async function POST(req: Request) {
  try {
    // The body is optional: earlier clients post nothing at all.
    const body = await req.json().catch(() => null)
    const label = normalizeSessionLabel((body as { label?: unknown } | null)?.label)
    return NextResponse.json(await createSession(label), { status: 201 })
  } catch {
    // Never echo the driver's message: it carries the Neon endpoint hostname,
    // and this page is on a lecture-hall projector.
    return NextResponse.json({ error: 'Could not start a session' }, { status: 500 })
  }
}
