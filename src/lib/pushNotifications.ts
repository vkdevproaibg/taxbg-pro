export interface PushConfig {
  enabled: boolean
  daysBeforeDeadline: number[]  // e.g. [7, 3, 1]
}

const PUSH_KEY = 'taxbg-push-config'
const SENT_KEY = 'taxbg-push-sent'

export function loadPushConfig(): PushConfig {
  try {
    const raw = localStorage.getItem(PUSH_KEY)
    return raw ? JSON.parse(raw) : { enabled: false, daysBeforeDeadline: [7, 3, 1] }
  } catch {
    return { enabled: false, daysBeforeDeadline: [7, 3, 1] }
  }
}

export function savePushConfig(config: PushConfig): void {
  localStorage.setItem(PUSH_KEY, JSON.stringify(config))
}

export async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function isPushSupported(): boolean {
  return 'Notification' in window
}

export function getPushPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

function getSentKey(eventId: string, daysUntil: number): string {
  const today = new Date().toISOString().slice(0, 10)
  return `${today}-${eventId}-${daysUntil}`
}

function wasAlreadySent(eventId: string, daysUntil: number): boolean {
  try {
    const sent = JSON.parse(localStorage.getItem(SENT_KEY) ?? '[]') as string[]
    return sent.includes(getSentKey(eventId, daysUntil))
  } catch { return false }
}

function markAsSent(eventId: string, daysUntil: number): void {
  try {
    const sent = JSON.parse(localStorage.getItem(SENT_KEY) ?? '[]') as string[]
    sent.push(getSentKey(eventId, daysUntil))
    // Keep only last 100 entries
    localStorage.setItem(SENT_KEY, JSON.stringify(sent.slice(-100)))
  } catch { /* ignore */ }
}

export function sendDeadlineNotification(
  title: string,
  body: string,
  eventId: string,
  daysUntil: number
): void {
  if (Notification.permission !== 'granted') return
  if (wasAlreadySent(eventId, daysUntil)) return

  try {
    const notification = new Notification(`TaxBG Pro · ${title}`, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: eventId,
    })

    notification.onclick = () => {
      window.focus()
      window.location.href = '/calendar'
      notification.close()
    }

    markAsSent(eventId, daysUntil)
  } catch { /* ignore */ }
}

export function checkAndSendNotifications(
  risks: import('./riskEngine').Risk[],
  config: PushConfig
): void {
  if (!config.enabled || Notification.permission !== 'granted') return

  for (const risk of risks) {
    if (risk.category !== 'deadline' || risk.daysUntil === undefined) continue

    const days = risk.daysUntil
    if (days < 0) {
      // Overdue - always notify
      sendDeadlineNotification(
        '🚨 Просрочено!',
        `${risk.title} - ${Math.abs(days)} дн. просрочки. ${risk.penaltyAmount ?? ''}`,
        risk.id,
        days
      )
    } else if (config.daysBeforeDeadline.includes(days)) {
      sendDeadlineNotification(
        days === 0 ? '⏰ Сегодня!' : `⏰ Через ${days} дн.`,
        risk.description,
        risk.id,
        days
      )
    }
  }
}
