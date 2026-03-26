const WASTE_ICONS = {
  restavfall: 'https://data.sortere.no/api/v3/bilder/2356/Restavfall',
  matavfall: 'https://data.sortere.no/api/v3/bilder/2340/Matavfall',
  papir: 'https://data.sortere.no/api/v3/bilder/2351/Papir',
  plastemballasje: 'https://data.sortere.no/api/v3/bilder/2327/Hard-plastemballasje',
  batteri: 'https://data.sortere.no/api/v3/bilder/2303/Batterier',
  metallemballasje: 'https://data.sortere.no/api/v3/bilder/2343/Metallemballasje',
  glassemballasje: 'https://data.sortere.no/api/v3/bilder/2449',
}

let scheduledTimers = []

function parseDate(dateStr) {
  const clean = dateStr.replace(/\//g, '.')
  const [d, m, y] = clean.split('.')
  return new Date(2000 + Number(y), Number(m) - 1, Number(d))
}

function formatDateShort(dateStr) {
  const date = parseDate(dateStr)
  const days = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag']
  return `${days[date.getDay()]} ${date.getDate()}.${date.getMonth() + 1}`
}

function scheduleNotifications(collections) {
  // Clear existing timers
  scheduledTimers.forEach(t => clearTimeout(t))
  scheduledTimers = []

  const now = new Date()

  collections.forEach(col => {
    const collectionDate = parseDate(col.date)
    const fractionList = col.fractions.join(', ')

    // First icon for the notification badge
    const firstKey = col.fractions[0]?.toLowerCase().trim()
    const icon = WASTE_ICONS[firstKey] || '/icon-192.png'

    // 2 days before at 18:00
    const twoDaysBefore = new Date(collectionDate)
    twoDaysBefore.setDate(twoDaysBefore.getDate() - 2)
    twoDaysBefore.setHours(18, 0, 0, 0)

    const msUntilTwoDays = twoDaysBefore.getTime() - now.getTime()
    if (msUntilTwoDays > 0) {
      const timer = setTimeout(() => {
        self.registration.showNotification('HuskSøppel', {
          body: `Hei! Husk at ${formatDateShort(col.date)} er det henting av ${fractionList}.`,
          icon: icon,
          badge: '/icon-192.png',
          tag: `reminder-2d-${col.date}`,
        })
      }, msUntilTwoDays)
      scheduledTimers.push(timer)
    }

    // 1 day before at 19:00
    const oneDayBefore = new Date(collectionDate)
    oneDayBefore.setDate(oneDayBefore.getDate() - 1)
    oneDayBefore.setHours(19, 0, 0, 0)

    const msUntilOneDay = oneDayBefore.getTime() - now.getTime()
    if (msUntilOneDay > 0) {
      const timer = setTimeout(() => {
        self.registration.showNotification('HuskSøppel', {
          body: `I morgen må søppelet ut! Henting av ${fractionList}.`,
          icon: icon,
          badge: '/icon-192.png',
          tag: `reminder-1d-${col.date}`,
        })
      }, msUntilOneDay)
      scheduledTimers.push(timer)
    }
  })
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHEDULE') {
    scheduleNotifications(event.data.collections)
  }
})

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      if (clients.length > 0) {
        return clients[0].focus()
      }
      return self.clients.openWindow('/')
    })
  )
})
