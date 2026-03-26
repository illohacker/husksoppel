import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const pw = new URL(req.url).searchParams.get('pw') ?? ''
  const envPw = process.env.DASHBOARD_PASSWORD

  if (!envPw || pw !== envPw)
    return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const url = process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !service)
    return Response.json({ error: 'Supabase not configured' }, { status: 503 })

  try {
    const res = await fetch(`${url}/rest/v1/rpc/get_dashboard_stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: service,
        Authorization: `Bearer ${service}`,
      },
      body: '{}',
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      const txt = await res.text()
      return Response.json({ error: `Supabase: ${res.status}`, detail: txt }, { status: 502 })
    }

    const data = await res.json()
    return Response.json(data)
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
