import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X } from 'lucide-react'
import { useNotificationsStore, type Notification } from '../../store/notificationsStore'
import { useUserStore } from '../../store/userStore'

const LABELS = {
  ru: { title: 'Уведомления', empty: 'Нет уведомлений', dismissAll: 'Закрыть все', ariaBell: 'Уведомления', ariaDismiss: 'Закрыть' },
  en: { title: 'Notifications', empty: 'No notifications', dismissAll: 'Dismiss all', ariaBell: 'Notifications', ariaDismiss: 'Dismiss' },
  bg: { title: 'Известия', empty: 'Няма известия', dismissAll: 'Затвори всички', ariaBell: 'Известия', ariaDismiss: 'Затвори' },
  uk: { title: 'Сповіщення', empty: 'Немає сповіщень', dismissAll: 'Закрити всі', ariaBell: 'Сповіщення', ariaDismiss: 'Закрити' },
}

function severityColor(severity: Notification['severity']): string {
  if (severity === 'critical') return '#ef4444'
  if (severity === 'warning') return '#f59e0b'
  return '#3b82f6'
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const language = useUserStore((s) => s.language)
  const notifications = useNotificationsStore((s) => s.notifications)
  const dismiss = useNotificationsStore((s) => s.dismiss)
  const dismissAll = useNotificationsStore((s) => s.dismissAll)

  const labels = LABELS[language] ?? LABELS.ru
  const active = notifications.filter((n) => !n.dismissedAt)
  const sorted = [...active].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 }
    return order[a.severity] - order[b.severity]
  })
  const count = active.length

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', escHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', escHandler)
    }
  }, [open])

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 transition-colors hover:bg-[--surface]"
        aria-label={labels.ariaBell}
      >
        <Bell className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border shadow-lg"
          style={{ backgroundColor: 'var(--surface-card)', borderColor: 'var(--border)' }}
        >
          <div className="border-b px-4 py-2.5" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {labels.title}
            </p>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {sorted.length === 0 ? (
              <p className="p-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                {labels.empty}
              </p>
            ) : (
              sorted.map((n) => (
                <div
                  key={n.id}
                  className="flex border-b last:border-b-0"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="w-1 shrink-0" style={{ backgroundColor: severityColor(n.severity) }} />
                  <button
                    type="button"
                    className="flex-1 cursor-pointer px-3 py-2.5 text-left hover:bg-[--surface]"
                    onClick={() => {
                      if (n.actionUrl) navigate(n.actionUrl)
                      setOpen(false)
                    }}
                  >
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {n.description}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      dismiss(n.id)
                    }}
                    className="flex shrink-0 items-start px-2 pt-2.5 hover:bg-[--surface]"
                    aria-label={labels.ariaDismiss}
                  >
                    <X className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>
              ))
            )}
          </div>

          {sorted.length > 0 && (
            <div className="border-t px-4 py-2" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={() => dismissAll()}
                className="text-xs hover:underline"
                style={{ color: 'var(--text-secondary)' }}
              >
                {labels.dismissAll}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
