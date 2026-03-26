'use client'

import { useState, useEffect, useCallback } from 'react'

interface Stats {
  total_sessions: number
  sessions_today: number
  sessions_week: number
  pageviews_today: number
  subscriptions_total: number
  subscriptions_today: number
  vipps_total: number
  vipps_today: number
  push_subscribers: number
  devices: Record<string, number>
  daily_visits: { date: string; count: number }[]
  peak_hour: number | null
}

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function DeviceBar({ devices }: { devices: Record<string, number> }) {
  const total = Object.values(devices).reduce((a, b) => a + b, 0) || 1
  const colors: Record<string, string> = { ios: '#007AFF', android: '#34A853', desktop: '#6B7280' }
  const labels: Record<string, string> = { ios: 'iOS', android: 'Android', desktop: 'Desktop' }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Enheter (unike brukere)</p>
      <div className="flex rounded-full overflow-hidden h-6 mb-3">
        {Object.entries(devices).map(([device, count]) => (
          <div
            key={device}
            style={{ width: `${(count / total) * 100}%`, backgroundColor: colors[device] ?? '#94a3b8' }}
            className="h-full"
          />
        ))}
      </div>
      <div className="flex gap-4 flex-wrap">
        {Object.entries(devices).map(([device, count]) => (
          <div key={device} className="flex items-center gap-1.5 text-sm">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[device] ?? '#94a3b8' }} />
            <span className="text-slate-600">{labels[device] ?? device}</span>
            <span className="font-semibold text-slate-900">{count}</span>
            <span className="text-slate-400">({Math.round((count / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActivityChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Daglige besøk (30 dager)</p>
      <div className="flex items-end gap-0.5 h-24">
        {data.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.count}`}>
            <div
              className="w-full bg-emerald-500 rounded-t-sm min-h-[2px]"
              style={{ height: `${(d.count / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-slate-400">{data[0]?.date?.slice(5)}</span>
        <span className="text-[10px] text-slate-400">{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  )
}

function PasswordGate({ onAuth }: { onAuth: (pw: string) => void }) {
  const [pw, setPw] = useState('')
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-sm w-full text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-4">Dashboard</h1>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAuth(pw)}
          placeholder="Passord"
          className="w-full px-4 py-2 border border-slate-200 rounded-lg mb-3"
        />
        <button
          onClick={() => onAuth(pw)}
          className="w-full py-2 bg-slate-900 text-white rounded-lg font-medium"
        >
          Logg inn
        </button>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [password, setPassword] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')

  const fetchStats = useCallback(async (pw: string) => {
    try {
      const res = await fetch(`/api/stats?pw=${encodeURIComponent(pw)}`)
      if (res.status === 401) { setError('Feil passord'); return }
      if (!res.ok) { setError('Feil ved henting'); return }
      const data = await res.json()
      setStats(data)
      setError('')
    } catch {
      setError('Nettverksfeil')
    }
  }, [])

  useEffect(() => {
    if (!password) return
    fetchStats(password)
    const iv = setInterval(() => fetchStats(password), 60000)
    return () => clearInterval(iv)
  }, [password, fetchStats])

  if (!password) {
    return (
      <PasswordGate
        onAuth={(pw) => {
          setPassword(pw)
          fetchStats(pw)
        }}
      />
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">HuskSøppel Dashboard</h1>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <KpiCard label="Besøk i dag" value={stats.sessions_today} sub={`${stats.pageviews_today} sidevisninger`} />
          <KpiCard label="Denne uken" value={stats.sessions_week} />
          <KpiCard label="Totalt" value={stats.total_sessions} />
          <KpiCard label="Peak time" value={stats.peak_hour !== null ? `${stats.peak_hour}:00` : '-'} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <KpiCard label="Push-abonnenter" value={stats.push_subscribers} />
          <KpiCard label="Nye i dag" value={stats.subscriptions_today} sub={`${stats.subscriptions_total} totalt`} />
          <KpiCard label="Vipps i dag" value={stats.vipps_today} />
          <KpiCard label="Vipps totalt" value={stats.vipps_total} />
        </div>

        {/* Device breakdown */}
        {stats.devices && Object.keys(stats.devices).length > 0 && (
          <div className="mb-6">
            <DeviceBar devices={stats.devices} />
          </div>
        )}

        {/* Activity chart */}
        {stats.daily_visits && stats.daily_visits.length > 0 && (
          <div className="mb-6">
            <ActivityChart data={stats.daily_visits} />
          </div>
        )}
      </div>
    </div>
  )
}
