import type { NextRequest } from 'next/server'

const KNOWN_EVENTS = new Set(['pageview', 'subscribe', 'vipps'])
const KNOWN_DEVICES = new Set(['ios', 'android', 'desktop'])

export async function POST(req: NextRequest) {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) return Response.json({ ok: true })

  try {
    const body = await req.json()

    const event = typeof body.event === 'string' && KNOWN_EVENTS.has(body.event)
      ? body.event : null
    if (!event) return Response.json({ ok: true })

    const row: Record<string, unknown> = { event }

    if (typeof body.sessionId === 'string' && body.sessionId.length <= 64)
      row.session_id = body.sessionId

    if (typeof body.device === 'string' && KNOWN_DEVICES.has(body.device))
      row.device = body.device

    await fetch(`${url}/rest/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(3000),
    })
  } catch { /* silent */ }

  return Response.json({ ok: true })
}
