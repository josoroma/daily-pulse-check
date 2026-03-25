import { NextResponse } from 'next/server'

export async function GET() {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    const res = await fetch(baseUrl, { signal: controller.signal })
    clearTimeout(timeout)

    return NextResponse.json({ ok: res.ok })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
