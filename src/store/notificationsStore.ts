import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CALENDAR_EVENTS_2026, type CalendarEvent } from '../constants/calendar-events'
import { getUpcomingEvents, getOverdueEvents } from '../lib/calendarUtils'
import { useUserStore, type AppLanguage } from './userStore'
import { useAuthStore } from './authStore'
import { useCompaniesStore } from './companiesStore'
import { useAccountingStore } from './accountingStore'

export type NotificationType = 'deadline' | 'overdue' | 'system' | 'correction'
export type NotificationSeverity = 'critical' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  description: string
  severity: NotificationSeverity
  eventId?: string
  period?: string
  daysUntil?: number
  actionUrl?: string
  dismissedAt?: string
  createdAt: string
}

interface NotificationsState {
  notifications: Notification[]
  lastChecked: string | null
  refreshNotifications: () => void
  dismiss: (id: string) => void
  dismissAll: () => void
  getActive: () => Notification[]
  getCriticalCount: () => number
}

function periodFromDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function severityFromDays(daysUntil: number): NotificationSeverity {
  if (daysUntil <= 3) return 'critical'
  if (daysUntil <= 7) return 'warning'
  return 'info'
}

function localizeDeadline(
  event: CalendarEvent,
  language: AppLanguage,
  daysUntil: number,
): { title: string; description: string } {
  const baseTitle = language === 'bg' ? event.title_bg : event.title_ru
  const days = daysUntil
  const penalty = event.penaltyAmount

  const titlePrefix = {
    ru: 'Срок',
    en: 'Deadline',
    bg: 'Срок',
    uk: 'Термін',
  }[language] ?? 'Срок'

  let description: string
  if (days === 0) {
    description = {
      ru: 'Сегодня',
      en: 'Today',
      bg: 'Днес',
      uk: 'Сьогодні',
    }[language] ?? 'Сегодня'
  } else if (days === 1) {
    description = {
      ru: 'Завтра',
      en: 'Tomorrow',
      bg: 'Утре',
      uk: 'Завтра',
    }[language] ?? 'Завтра'
  } else {
    description = {
      ru: `Через ${days} дн.`,
      en: `In ${days} days`,
      bg: `След ${days} дни`,
      uk: `Через ${days} дн.`,
    }[language] ?? `Через ${days} дн.`
  }

  if (penalty) {
    const penaltyLabel = {
      ru: 'Штраф',
      en: 'Penalty',
      bg: 'Глоба',
      uk: 'Штраф',
    }[language] ?? 'Штраф'
    description += ` · ${penaltyLabel}: ${penalty}`
  }

  return {
    title: `${titlePrefix}: ${baseTitle}`,
    description,
  }
}

function localizeOverdue(
  event: CalendarEvent,
  language: AppLanguage,
  daysOverdue: number,
): { title: string; description: string } {
  const baseTitle = language === 'bg' ? event.title_bg : event.title_ru
  const penalty = event.penaltyAmount

  const titlePrefix = {
    ru: 'Просрочено',
    en: 'Overdue',
    bg: 'Просрочено',
    uk: 'Прострочено',
  }[language] ?? 'Просрочено'

  let description = {
    ru: `Просрочено на ${daysOverdue} дн.`,
    en: `Overdue by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'}`,
    bg: `Просрочен със ${daysOverdue} дни`,
    uk: `Прострочено на ${daysOverdue} дн.`,
  }[language] ?? `Просрочено на ${daysOverdue} дн.`

  if (penalty) {
    const penaltyLabel = {
      ru: 'Штраф',
      en: 'Penalty',
      bg: 'Глоба',
      uk: 'Штраф',
    }[language] ?? 'Штраф'
    description += ` · ${penaltyLabel}: ${penalty}`
  }

  return {
    title: `${titlePrefix}: ${baseTitle}`,
    description,
  }
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: [],
      lastChecked: null,

      refreshNotifications: () => {
        const isDemo = useAuthStore.getState().isDemo
        const activeCompanyId = useCompaniesStore.getState().activeCompanyId
        const transactions = useAccountingStore.getState().transactions
        const { legalForm, language } = useUserStore.getState()

        const nowIso = new Date().toISOString()

        if (isDemo || !activeCompanyId || transactions.length === 0) {
          set({ notifications: [], lastChecked: nowIso })
          return
        }

        const upcoming = getUpcomingEvents(CALENDAR_EVENTS_2026, legalForm, 14)
        const overdue = getOverdueEvents(CALENDAR_EVENTS_2026, legalForm)

        const fresh: Notification[] = []

        for (const { event, date, daysUntil } of upcoming) {
          const period = periodFromDate(date)
          const id = `deadline-${event.id}-${period}`
          const texts = localizeDeadline(event, language, daysUntil)
          fresh.push({
            id,
            type: 'deadline',
            title: texts.title,
            description: texts.description,
            severity: severityFromDays(daysUntil),
            eventId: event.id,
            period,
            daysUntil,
            actionUrl: '/calendar',
            createdAt: nowIso,
          })
        }

        for (const { event, date, daysOverdue } of overdue) {
          const period = periodFromDate(date)
          const id = `overdue-${event.id}-${period}`
          const texts = localizeOverdue(event, language, daysOverdue)
          fresh.push({
            id,
            type: 'overdue',
            title: texts.title,
            description: texts.description,
            severity: 'critical',
            eventId: event.id,
            period,
            daysUntil: -daysOverdue,
            actionUrl: '/calendar',
            createdAt: nowIso,
          })
        }

        const existing = get().notifications
        const existingById = new Map(existing.map((n) => [n.id, n]))

        const merged: Notification[] = fresh.map((n) => {
          const prev = existingById.get(n.id)
          if (prev) {
            return {
              ...n,
              title: prev.dismissedAt ? prev.title : n.title,
              description: prev.dismissedAt ? prev.description : n.description,
              dismissedAt: prev.dismissedAt,
              createdAt: prev.createdAt,
            }
          }
          return n
        })

        set({ notifications: merged, lastChecked: nowIso })
      },

      dismiss: (id) => {
        const nowIso = new Date().toISOString()
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, dismissedAt: nowIso } : n,
          ),
        }))
      },

      dismissAll: () => {
        const nowIso = new Date().toISOString()
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.dismissedAt ? n : { ...n, dismissedAt: nowIso },
          ),
        }))
      },

      getActive: () => get().notifications.filter((n) => !n.dismissedAt),

      getCriticalCount: () =>
        get().notifications.filter((n) => !n.dismissedAt && n.severity === 'critical').length,
    }),
    { name: 'taxbg-notifications' },
  ),
)
