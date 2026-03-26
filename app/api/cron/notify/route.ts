import * as cheerio from 'cheerio'
import webpush from 'web-push'

interface Subscription {
  endpoint: string
  keys_p256dh: string
  keys_auth: string
  address_id: string
  address_text: string
}

interface WasteCollection {
  date: string
  fractions: string[]
}

function parseDate(dateStr: string): Date {
  const clean = dateStr.replace(/\//g, '.')
  const [d, m, y] = clean.split('.')
  return new Date(2000 + Number(y), Number(m) - 1, Number(d))
}

function formatDateShort(dateStr: string): string {
  const date = parseDate(dateStr)
  const days = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag']
  return `${days[date.getDay()]} ${date.getDate()}.${date.getMonth() + 1}`
}

function daysUntil(dateStr: string): number {
  const target = parseDate(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

async function fetchCalendar(addressId: string, addressText: string): Promise<WasteCollection[]> {
  const url = `https://www.rir.no/hentekalender?location=${encodeURIComponent(addressText)}&addressId=${encodeURIComponent(addressId)}`
  const res = await fetch(url, { headers: { 'Accept-Language': 'no' } })
  if (!res.ok) return []

  const html = await res.text()
  const $ = cheerio.load(html)
  const collections: WasteCollection[] = []

  $('.collectionCalendar__date-wrapper').each((_, wrapper) => {
    const dateText = $(wrapper).find('.collectionCalendar__date-text').text().trim()
    const fractions: string[] = []
    $(wrapper)
      .find('.collectionCalendar__fraction-text')
      .each((_, el) => {
        const text = $(el).text().trim().replace(/^,\s*/, '')
        if (text) fractions.push(text)
      })
    if (dateText && fractions.length > 0) {
      collections.push({ date: dateText, fractions })
    }
  })

  return collections
}

const WASTE_ICONS: Record<string, string> = {
  restavfall: 'https://data.sortere.no/api/v3/bilder/2356/Restavfall',
  matavfall: 'https://data.sortere.no/api/v3/bilder/2340/Matavfall',
  papir: 'https://data.sortere.no/api/v3/bilder/2351/Papir',
  plastemballasje: 'https://data.sortere.no/api/v3/bilder/2327/Hard-plastemballasje',
  batteri: 'https://data.sortere.no/api/v3/bilder/2303/Batterier',
  metallemballasje: 'https://data.sortere.no/api/v3/bilder/2343/Metallemballasje',
  glassemballasje: 'https://data.sortere.no/api/v3/bilder/2449',
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  webpush.setVapidDetails(
    'mailto:cbu100@gmail.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  // Fetch all subscriptions
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const subRes = await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?select=*`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  })

  if (!subRes.ok) {
    return Response.json({ error: 'Failed to fetch subscriptions' }, { status: 502 })
  }

  const subscriptions: Subscription[] = await subRes.json()
  let sent = 0
  let errors = 0

  // Group subscriptions by address to avoid duplicate scrapes
  const byAddress = new Map<string, Subscription[]>()
  for (const sub of subscriptions) {
    const key = sub.address_id
    if (!byAddress.has(key)) byAddress.set(key, [])
    byAddress.get(key)!.push(sub)
  }

  for (const [addressId, subs] of byAddress) {
    const addressText = subs[0].address_text
    const collections = await fetchCalendar(addressId, addressText)

    for (const col of collections) {
      const days = daysUntil(col.date)
      const fractionList = col.fractions.join(', ')
      const firstKey = col.fractions[0]?.toLowerCase().trim()
      const icon = WASTE_ICONS[firstKey] || undefined

      let body: string | null = null

      if (days === 2) {
        body = `Hei! Husk at ${formatDateShort(col.date)} er det henting av ${fractionList}.`
      } else if (days === 1) {
        body = `I morgen må søppelet ut! Henting av ${fractionList}.`
      }

      if (!body) continue

      const payload = JSON.stringify({
        title: 'HuskSøppel',
        body,
        icon,
        tag: `reminder-${days}d-${col.date}`,
      })

      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
            },
            payload
          )
          sent++
        } catch (err: unknown) {
          errors++
          // Remove expired subscriptions (410 Gone)
          if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
            await fetch(
              `${supabaseUrl}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`,
              {
                method: 'DELETE',
                headers: {
                  apikey: supabaseKey,
                  Authorization: `Bearer ${supabaseKey}`,
                },
              }
            )
          }
        }
      }
    }
  }

  return Response.json({ sent, errors, subscriptions: subscriptions.length })
}
