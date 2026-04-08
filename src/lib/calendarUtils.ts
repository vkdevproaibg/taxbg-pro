import {
  eachDayOfInterval, isSameMonth, isToday,
  format,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import type { CalendarEvent } from '../constants/calendar-events'
import type { LegalForm } from '../store/userStore'

export interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  events: CalendarEvent[]
}

export interface CalendarMonth {
  year: number
  month: number
  label: string
  days: CalendarDay[]
  events: CalendarEvent[]
}

export function isEventActive(event: CalendarEvent, date: Date): boolean {
  const d = date.toISOString().slice(0, 10)
  if (d < event.effectiveFrom) return false
  if (event.effectiveTo && d > event.effectiveTo) return false
  return true
}

export function getEventsForDate(
  date: Date,
  events: CalendarEvent[],
  legalForm: LegalForm
): CalendarEvent[] {
  const month = date.getMonth() + 1
  const day = date.getDate()

  return events.filter((e) => {
    if (!e.forms.includes(legalForm)) return false
    if (!isEventActive(e, date)) return false
    if (e.recurrence === 'monthly' && e.dayOfMonth) {
      return day === e.dayOfMonth
    }
    if ((e.recurrence === 'annual' || e.recurrence === 'quarterly') && e.month && e.day) {
      return month === e.month && day === e.day
    }
    return false
  })
}

export function buildCalendarMonth(
  year: number,
  month: number,
  events: CalendarEvent[],
  legalForm: LegalForm
): CalendarMonth {
  const firstDay = new Date(year, month, 1)

  const startPad = (firstDay.getDay() + 6) % 7
  const gridStart = new Date(firstDay)
  gridStart.setDate(gridStart.getDate() - startPad)

  const lastDay = new Date(year, month + 1, 0)
  const endPad = (7 - (lastDay.getDay() + 6) % 7 - 1) % 7
  const gridEnd = new Date(lastDay)
  gridEnd.setDate(gridEnd.getDate() + endPad)

  const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const days: CalendarDay[] = allDays.map((date) => ({
    date,
    isCurrentMonth: isSameMonth(date, firstDay),
    isToday: isToday(date),
    events: getEventsForDate(date, events, legalForm),
  }))

  const monthEvents = events.filter((e) => {
    if (!e.forms.includes(legalForm)) return false
    if (!isEventActive(e, firstDay)) return false
    if (e.recurrence === 'monthly') return true
    if (e.month) return e.month === month + 1
    return false
  })

  return {
    year, month,
    label: format(firstDay, 'LLLL yyyy', { locale: ru }),
    days,
    events: monthEvents,
  }
}

export function getUpcomingEvents(
  events: CalendarEvent[],
  legalForm: LegalForm,
  daysAhead = 30
): { event: CalendarEvent; date: Date; daysUntil: number }[] {
  const today = new Date()
  const result: { event: CalendarEvent; date: Date; daysUntil: number }[] = []

  for (let d = 0; d <= daysAhead; d++) {
    const date = new Date(today)
    date.setDate(date.getDate() + d)
    getEventsForDate(date, events, legalForm).forEach((event) => {
      result.push({ event, date: new Date(date), daysUntil: d })
    })
  }

  return result.sort((a, b) => a.daysUntil - b.daysUntil)
}

export function getOverdueEvents(
  events: CalendarEvent[],
  legalForm: LegalForm
): { event: CalendarEvent; date: Date; daysOverdue: number }[] {
  const today = new Date()
  const result: { event: CalendarEvent; date: Date; daysOverdue: number }[] = []

  for (let d = 1; d <= 30; d++) {
    const date = new Date(today)
    date.setDate(date.getDate() - d)
    getEventsForDate(date, events, legalForm).forEach((event) => {
      result.push({ event, date: new Date(date), daysOverdue: d })
    })
  }

  return result.sort((a, b) => a.daysOverdue - b.daysOverdue)
}
