export async function POST(request: Request) {
  const { subscription, addressId, addressText } = await request.json()

  if (!subscription?.endpoint || !addressId) {
    return Response.json({ error: 'Missing data' }, { status: 400 })
  }

  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_ANON_KEY!

  // Upsert subscription (update address if endpoint already exists)
  const res = await fetch(`${supabaseUrl}/rest/v1/push_subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys_p256dh: subscription.keys.p256dh,
      keys_auth: subscription.keys.auth,
      address_id: addressId,
      address_text: addressText,
      updated_at: new Date().toISOString(),
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('Supabase error:', text)
    return Response.json({ error: 'Failed to save subscription' }, { status: 502 })
  }

  return Response.json({ ok: true })
}
