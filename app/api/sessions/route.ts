import { NextResponse } from 'next/server'
import { createSession } from '@/lib/db'

export async function POST() {
  try {
    return NextResponse.json(await createSession(), { status: 201 })
  } catch {
    // Never echo the driver's message: it carries the Neon endpoint hostname,
    // and this page is on a lecture-hall projector.
    return NextResponse.json({ error: 'Could not start a session' }, { status: 500 })
  }
}
