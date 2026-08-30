import { NextResponse } from 'next/server'
import { createSession } from '@/lib/db'

export async function POST() {
  try {
    return NextResponse.json(await createSession(), { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
