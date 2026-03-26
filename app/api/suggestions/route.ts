import type { AddressSuggestion } from '@/app/_lib/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query || query.length < 2) {
    return Response.json([])
  }

  const res = await fetch(
    `https://www.rir.no/actions/rir/location/get-address-suggestion?query=${encodeURIComponent(query)}`,
    { headers: { 'Accept-Language': 'no' } }
  )

  if (!res.ok) {
    return Response.json([], { status: 502 })
  }

  const data = await res.json()

  const suggestions: AddressSuggestion[] = (data.Options ?? []).map(
    (opt: { Id: string; Text: string }) => ({
      id: opt.Id,
      text: opt.Text,
    })
  )

  return Response.json(suggestions)
}
