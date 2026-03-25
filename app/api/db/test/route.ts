import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const start = Date.now()

  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('profiles')
      .select('id', { head: true, count: 'exact' })
      .limit(1)

    const elapsed = Date.now() - start

    if (error) {
      return NextResponse.json({
        ok: false,
        message: error.message,
        elapsed,
      })
    }

    return NextResponse.json({ ok: true, elapsed })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      message: err instanceof Error ? err.message : 'Unknown error',
      elapsed: Date.now() - start,
    })
  }
}
