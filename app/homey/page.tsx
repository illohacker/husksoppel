'use client'

import { useState } from 'react'

interface Suggestion {
  id: string
  text: string
}

export default function HomeyPage() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selected, setSelected] = useState<Suggestion | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  async function handleSearch(value: string) {
    setQuery(value)
    setSelected(null)
    if (value.length < 2) {
      setSuggestions([])
      return
    }
    const res = await fetch(`/api/suggestions?q=${encodeURIComponent(value)}`)
    const data = await res.json()
    setSuggestions(data)
  }

  function handleSelect(s: Suggestion) {
    setSelected(s)
    setQuery(s.text)
    setSuggestions([])
  }

  async function copyToClipboard(text: string, field: string) {
    await navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: '#00a86b' }}>
          HuskSøppel for Homey
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: 32 }}>
          Finn adresse-ID og tekst for å konfigurere Homey-appen.
        </p>

        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
          Skriv inn adressen din:
        </label>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="F.eks. Eidemsbakken 27"
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 8,
            border: '2px solid #334155',
            background: '#1e293b',
            color: '#e2e8f0',
            fontSize: 16,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {suggestions.length > 0 && (
          <div style={{ background: '#1e293b', borderRadius: 8, marginTop: 4, border: '1px solid #334155' }}>
            {suggestions.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelect(s)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  color: '#e2e8f0',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 14,
                  borderBottom: '1px solid #334155',
                }}
              >
                {s.text}
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div style={{ marginTop: 32, background: '#1e293b', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: '#00a86b' }}>
              Homey-innstillinger
            </h2>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
                Address ID (brukernavn-feltet i Homey)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <code style={{
                  flex: 1,
                  background: '#0f172a',
                  padding: '10px 14px',
                  borderRadius: 6,
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#fbbf24',
                  fontFamily: 'monospace',
                }}>
                  {selected.id}
                </code>
                <button
                  onClick={() => copyToClipboard(selected.id, 'id')}
                  style={{
                    padding: '10px 16px',
                    background: copied === 'id' ? '#00a86b' : '#334155',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  {copied === 'id' ? 'Kopiert!' : 'Kopier'}
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
                Adressetekst (passord-feltet i Homey)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <code style={{
                  flex: 1,
                  background: '#0f172a',
                  padding: '10px 14px',
                  borderRadius: 6,
                  fontSize: 14,
                  color: '#fbbf24',
                  fontFamily: 'monospace',
                }}>
                  {selected.text}
                </code>
                <button
                  onClick={() => copyToClipboard(selected.text, 'text')}
                  style={{
                    padding: '10px 16px',
                    background: copied === 'text' ? '#00a86b' : '#334155',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  {copied === 'text' ? 'Kopiert!' : 'Kopier'}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 24, padding: 16, background: '#0f172a', borderRadius: 8, fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
              <strong style={{ color: '#e2e8f0' }}>Slik bruker du dette i Homey:</strong><br />
              1. Installer HuskSøppel-appen på Homey<br />
              2. Legg til enhet → HuskSøppel → Søppelkalender<br />
              3. Lim inn <strong>Address ID</strong> i brukernavn-feltet<br />
              4. Lim inn <strong>Adressetekst</strong> i passord-feltet<br />
              5. Ferdig! Enheten viser neste hentedato
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
