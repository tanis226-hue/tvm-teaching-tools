import { NextResponse } from 'next/server'
import { getSession, listSubmissions } from '@/lib/db'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params
    const session = await getSession(code)
    if (!session) return NextResponse.json({ error: 'Unknown session' }, { status: 404 })
    return NextResponse.json({
      label: session.label,
      submissions: await listSubmissions(session.id),
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
