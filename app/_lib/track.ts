const SESSION_KEY = 'hs_sid'

function getSessionId(): string {
  try {
    let sid = localStorage.getItem(SESSION_KEY)
    if (!sid) {
      sid = crypto.randomUUID()
      localStorage.setItem(SESSION_KEY, sid)
    }
    return sid
  } catch { return 'unknown' }
}

function getDevice(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

export type TrackPayload =
  | { event: 'pageview' }
  | { event: 'subscribe' }
  | { event: 'vipps' }

export function track(payload: TrackPayload): void {
  try {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        sessionId: getSessionId(),
        device: getDevice(),
      }),
      keepalive: true,
    }).catch(() => {})
  } catch { /* never throw */ }
}
