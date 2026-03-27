import * as cheerio from 'cheerio'

interface WasteCollection {
  date: string
  fractions: string[]
}

function parseDate(dateStr: string): Date {
  const clean = dateStr.replace(/\//g, '.')
  const [d, m, y] = clean.split('.')
  return new Date(2000 + Number(y), Number(m) - 1, Number(d))
}

function daysUntil(dateStr: string): number {
  const target = parseDate(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const addressId = searchParams.get('addressId')
  const location = searchParams.get('location')

  if (!addressId || !location) {
    return Response.json({ error: 'Missing addressId or location' }, { status: 400 })
  }

  const url = `https://www.rir.no/hentekalender?location=${encodeURIComponent(location)}&addressId=${encodeURIComponent(addressId)}`
  const res = await fetch(url, { headers: { 'Accept-Language': 'no' } })

  if (!res.ok) {
    return Response.json({ error: 'Failed to fetch calendar' }, { status: 502 })
  }

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

  // Find next collection
  const upcoming = collections
    .map(c => ({ ...c, daysUntil: daysUntil(c.date) }))
    .filter(c => c.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)

  const next = upcoming[0] || null
  const nextAfter = upcoming[1] || null

  const shortNames: Record<string, string> = {
    restavfall: 'Rest',
    matavfall: 'Mat',
    papir: 'Papir',
    plastemballasje: 'Plast',
    batteri: 'Batteri',
    metallemballasje: 'Metall',
    glassemballasje: 'Glass',
  }

  const formatCollection = (col: WasteCollection & { daysUntil: number }) => {
    const date = parseDate(col.date)
    const days = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag']
    return {
      date: col.date,
      isoDate: date.toISOString().split('T')[0],
      dayName: days[date.getDay()],
      daysUntil: col.daysUntil,
      fractions: col.fractions,
      fractionsShort: col.fractions.map(f => shortNames[f.toLowerCase().trim()] || f),
      summary: col.fractions.map(f => shortNames[f.toLowerCase().trim()] || f).join(', '),
      isToday: col.daysUntil === 0,
      isTomorrow: col.daysUntil === 1,
    }
  }

  return Response.json({
    address: location,
    next: next ? formatCollection(next) : null,
    nextAfter: nextAfter ? formatCollection(nextAfter) : null,
    allUpcoming: upcoming.map(formatCollection),
    updatedAt: new Date().toISOString(),
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
