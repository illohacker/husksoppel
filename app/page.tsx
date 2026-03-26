'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { AddressSuggestion, WasteCollection } from './_lib/types'
import { WASTE_ICONS, WASTE_COLORS } from './_lib/types'

function parseDate(dateStr: string): Date {
  const clean = dateStr.replace(/\//g, '.')
  const [d, m, y] = clean.split('.')
  return new Date(2000 + Number(y), Number(m) - 1, Number(d))
}

function formatDateNorwegian(dateStr: string): string {
  const date = parseDate(dateStr)
  const days = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag']
  const months = [
    'januar', 'februar', 'mars', 'april', 'mai', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'desember',
  ]
  return `${days[date.getDay()]} ${date.getDate()}. ${months[date.getMonth()]}`
}

function daysUntil(dateStr: string): number {
  const target = parseDate(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function fractionKey(name: string): string {
  return name.toLowerCase().trim()
}

function daysLabel(n: number): string {
  if (n === 0) return 'I dag!'
  if (n === 1) return 'I morgen'
  return `Om ${n} dager`
}

export default function Home() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<{ id: string; text: string } | null>(null)
  const [collections, setCollections] = useState<WasteCollection[]>([])
  const [loading, setLoading] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [notificationStatus, setNotificationStatus] = useState<string>('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load saved address from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('husksoppel-address')
    if (saved) {
      const addr = JSON.parse(saved)
      setSelectedAddress(addr)
      setQuery(addr.text)
    }
    if ('Notification' in window && Notification.permission === 'granted' && localStorage.getItem('husksoppel-push')) {
      setNotificationsEnabled(true)
    }
  }, [])

  // Fetch calendar when address is selected
  useEffect(() => {
    if (!selectedAddress) return
    setLoading(true)
    fetch(
      `/api/calendar?addressId=${encodeURIComponent(selectedAddress.id)}&location=${encodeURIComponent(selectedAddress.text)}`
    )
      .then((r) => r.json())
      .then((data) => setCollections(data))
      .catch(() => setCollections([]))
      .finally(() => setLoading(false))
  }, [selectedAddress])

  const searchAddress = useCallback((q: string) => {
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    fetch(`/api/suggestions?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => {
        setSuggestions(data)
        setShowSuggestions(true)
      })
  }, [])

  function handleInput(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchAddress(value), 300)
  }

  function selectAddress(suggestion: AddressSuggestion) {
    setQuery(suggestion.text)
    setSelectedAddress({ id: suggestion.id, text: suggestion.text })
    setShowSuggestions(false)
    setSuggestions([])
    localStorage.setItem(
      'husksoppel-address',
      JSON.stringify({ id: suggestion.id, text: suggestion.text })
    )
  }

  function clearAddress() {
    setQuery('')
    setSelectedAddress(null)
    setCollections([])
    localStorage.removeItem('husksoppel-address')
    inputRef.current?.focus()
  }

  async function enableNotifications() {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setNotificationStatus('Nettleseren din støtter ikke push-varsler.')
      return
    }
    if (!selectedAddress) {
      setNotificationStatus('Velg en adresse først.')
      return
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setNotificationStatus('Du må tillate varsler for å bruke denne funksjonen.')
      return
    }

    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })

      // Send subscription to our backend
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          addressId: selectedAddress.id,
          addressText: selectedAddress.text,
        }),
      })

      if (res.ok) {
        setNotificationsEnabled(true)
        setNotificationStatus('Varsler er aktivert!')
        localStorage.setItem('husksoppel-push', 'true')
      } else {
        setNotificationStatus('Kunne ikke lagre varsling. Prøv igjen.')
      }
    } catch (err) {
      console.error('Push subscription error:', err)
      setNotificationStatus('Noe gikk galt. Prøv igjen.')
    }
  }

  return (
    <main className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white px-4 py-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">HuskSøppel</h1>
        <p className="text-slate-400 text-sm mt-1">
          Aldri glem søppelhentingen igjen
        </p>
      </header>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {/* Address search */}
        <div className="relative">
          <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-2">
            Skriv inn adressen din
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              id="address"
              type="text"
              value={query}
              onChange={(e) => handleInput(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="F.eks. Eidemsbakken 27B"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-base"
              autoComplete="off"
            />
            {selectedAddress && (
              <button
                onClick={clearAddress}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xl"
                aria-label="Fjern adresse"
              >
                ✕
              </button>
            )}
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => selectAddress(s)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                  >
                    {s.text}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-8 text-center text-slate-500">
            <div className="inline-block w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
            <p className="mt-2 text-sm">Henter hentekalender…</p>
          </div>
        )}

        {/* Calendar results */}
        {!loading && collections.length > 0 && (
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">
              Neste hentedager
            </h2>

            {collections.map((col, i) => {
              const days = daysUntil(col.date)
              const isUrgent = days <= 1
              return (
                <div
                  key={i}
                  className={`rounded-2xl border p-4 shadow-sm transition-all ${
                    isUrgent
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-900 capitalize">
                        {formatDateNorwegian(col.date)}
                      </p>
                      <p
                        className={`text-sm font-medium ${
                          isUrgent ? 'text-amber-600' : 'text-slate-500'
                        }`}
                      >
                        {daysLabel(days)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {col.fractions.map((frac) => {
                      const key = fractionKey(frac)
                      const icon = WASTE_ICONS[key]
                      const color = WASTE_COLORS[key] ?? '#64748b'
                      return (
                        <div
                          key={frac}
                          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-white text-xs font-medium"
                          style={{ backgroundColor: color }}
                        >
                          {icon && (
                            <img
                              src={icon}
                              alt={frac}
                              className="w-5 h-5 rounded-sm"
                            />
                          )}
                          {frac}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Notifications toggle */}
            {!notificationsEnabled ? (
              <button
                onClick={enableNotifications}
                className="w-full mt-4 py-3 px-4 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                Aktiver påminnelser
              </button>
            ) : (
              <div className="mt-4 py-3 px-4 bg-green-50 border border-green-200 rounded-xl text-center text-green-800 text-sm font-medium">
                Påminnelser er aktivert
              </div>
            )}
            {notificationStatus && !notificationsEnabled && (
              <p className="text-sm text-slate-500 text-center">{notificationStatus}</p>
            )}
          </div>
        )}

        {/* Empty state after selection with no results */}
        {!loading && selectedAddress && collections.length === 0 && (
          <div className="mt-8 text-center text-slate-500">
            <p>Ingen hentedager funnet for denne adressen.</p>
            <p className="text-sm mt-1">Prøv en annen adresse.</p>
          </div>
        )}

        {/* Initial empty state */}
        {!selectedAddress && !loading && (
          <div className="mt-12 text-center text-slate-400">
            <p className="text-sm">
              Søk etter adressen din for å se<br />
              når søppelet ditt hentes.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-4">
        Data fra{' '}
        <a href="https://www.rir.no" className="underline hover:text-slate-600" target="_blank" rel="noopener">
          rir.no
        </a>
      </footer>
    </main>
  )
}
