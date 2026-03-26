import * as cheerio from 'cheerio'
import type { WasteCollection } from '@/app/_lib/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const addressId = searchParams.get('addressId')
  const location = searchParams.get('location')

  if (!addressId || !location) {
    return Response.json({ error: 'Missing addressId or location' }, { status: 400 })
  }

  const url = `https://www.rir.no/hentekalender?location=${encodeURIComponent(location)}&addressId=${encodeURIComponent(addressId)}`

  const res = await fetch(url, {
    headers: { 'Accept-Language': 'no' },
  })

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

  return Response.json(collections)
}
