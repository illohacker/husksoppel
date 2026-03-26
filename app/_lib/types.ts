export interface AddressSuggestion {
  id: string
  text: string
}

export interface WasteCollection {
  date: string          // dd.MM.yy
  fractions: string[]   // e.g. ["Restavfall", "Matavfall"]
}

export const WASTE_ICONS: Record<string, string> = {
  restavfall: 'https://data.sortere.no/api/v3/bilder/2356/Restavfall',
  matavfall: 'https://data.sortere.no/api/v3/bilder/2340/Matavfall',
  papir: 'https://data.sortere.no/api/v3/bilder/2351/Papir',
  plastemballasje: 'https://data.sortere.no/api/v3/bilder/2327/Hard-plastemballasje',
  batteri: 'https://data.sortere.no/api/v3/bilder/2303/Batterier',
  metallemballasje: 'https://data.sortere.no/api/v3/bilder/2343/Metallemballasje',
  glassemballasje: 'https://data.sortere.no/api/v3/bilder/2449',
}

export const WASTE_COLORS: Record<string, string> = {
  restavfall: '#1a1a1a',
  matavfall: '#00a86b',
  papir: '#2196f3',
  plastemballasje: '#9c27b0',
  batteri: '#d32f2f',
  metallemballasje: '#616161',
  glassemballasje: '#00897b',
}
