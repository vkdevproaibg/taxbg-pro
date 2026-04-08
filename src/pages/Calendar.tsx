import { useState, useEffect, useMemo } from 'react'
import { addMonths, subMonths, format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useUserStore } from '../store/userStore'
import { CALENDAR_EVENTS_2026, CATEGORY_META } from '../constants/calendar-events'
import type { EventCategory } from '../constants/calendar-events'
import {
  buildCalendarMonth,
  getUpcomingEvents,
  getOverdueEvents,
  getEventsForDate,
} from '../lib/calendarUtils'
import {
  checkLegislationUpdates,
  saveLegislationUpdates,
  loadLegislationUpdates,
  shouldCheck,
  getLastCheckDate,
} from '../lib/legislationMonitor'
import MonthView  from '../modules/calendar/MonthView'
import YearView   from '../modules/calendar/YearView'
import EventCard  from '../modules/calendar/EventCard'
import HelpButton from '../components/ui/HelpButton'

type ViewMode = 'month' | 'next' | 'year'

export default function Calendar() {
  const { legalForm, llmApiKey } = useUserStore()

  const [viewMode,      setViewMode]      = useState<ViewMode>('month')
  const [currentDate,   setCurrentDate]   = useState(new Date())
  const [selectedDate,  setSelectedDate]  = useState<Date | null>(null)
  const [filterCat,     setFilterCat]     = useState<EventCategory | 'all'>('all')
  const [updates,       setUpdates]       = useState(loadLegislationUpdates)
  const [checking,      setChecking]      = useState(false)
  const [lastCheck,     setLastCheck]     = useState(getLastCheckDate)

  const year  = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const filtered = useMemo(() =>
    CALENDAR_EVENTS_2026.filter((e) =>
      filterCat === 'all' || e.category === filterCat
    ), [filterCat])

  const calendar     = useMemo(() => buildCalendarMonth(year, month,     filtered, legalForm), [year, month,     filtered, legalForm])
  const nextCalendar = useMemo(() => buildCalendarMonth(year, month + 1, filtered, legalForm), [year, month,     filtered, legalForm])
  const upcoming     = useMemo(() => getUpcomingEvents(filtered, legalForm, 30),               [filtered, legalForm])
  const overdue      = useMemo(() => getOverdueEvents(filtered, legalForm),                    [filtered, legalForm])

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return []
    return getEventsForDate(selectedDate, filtered, legalForm)
  }, [selectedDate, filtered, legalForm])

  const handleCheckLegislation = async () => {
    setChecking(true)
    try {
      const found = await checkLegislationUpdates(CALENDAR_EVENTS_2026, llmApiKey || undefined)
      saveLegislationUpdates(found)
      setUpdates(found)
      setLastCheck(new Date().toISOString())
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    if (shouldCheck() && llmApiKey) void handleCheckLegislation()
  }, [])

  return (
    <div className="space-y-5 p-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Данъчен календар</h1>
            <HelpButton topic="календар на отчетността задължения ООД дедлайни" title="Календарь отчётности" pageContext="calendar" size="md" />
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Отчётность и уплата налогов · сроки и штрафы · ставки 2026
          </p>
        </div>
        <button onClick={handleCheckLegislation} disabled={checking}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40">
          {checking ? '⏳ Проверка изменений...' : '🔍 Проверить законодательство'}
        </button>
      </div>

      {/* Legislation updates banner */}
      {updates.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-800">
            ⚠ Обнаружены изменения в законодательстве ({updates.length})
          </p>
          {updates.map((u) => (
            <div key={u.eventId} className="text-xs text-amber-700 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`rounded px-1.5 py-0.5 font-medium ${
                  u.severity === 'critical' ? 'bg-red-100 text-red-700' :
                  u.severity === 'warning'  ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}>{u.severity}</span>
                <span className="font-medium">{u.eventId}</span>
                {u.dvNumber && <span className="text-amber-600">{u.dvNumber}</span>}
              </div>
              <p>{u.summary_ru}</p>
              {u.publishedAt && (
                <p className="text-amber-500">
                  Опубликовано: {u.publishedAt}
                  {u.effectiveFrom && u.effectiveFrom !== u.publishedAt &&
                    ` · В силе с: ${u.effectiveFrom}`}
                </p>
              )}
              {u.sourceUrl && (
                <a href={u.sourceUrl} target="_blank" rel="noreferrer"
                  className="underline text-amber-600">
                  Источник →
                </a>
              )}
            </div>
          ))}
          <button
            onClick={() => { saveLegislationUpdates([]); setUpdates([]) }}
            className="text-xs text-amber-500 underline">
            Скрыть уведомления
          </button>
        </div>
      )}

      {/* Overdue banner */}
      {overdue.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-red-700">
            🚨 Просроченные обязательства ({overdue.length})
          </p>
          {overdue.slice(0, 3).map(({ event, daysOverdue }) => (
            <EventCard key={event.id} event={event} daysOverdue={daysOverdue} />
          ))}
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterCat('all')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
            filterCat === 'all'
              ? 'bg-slate-800 text-white border-slate-800'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}>
          Все
        </button>
        {(Object.entries(CATEGORY_META) as [EventCategory, typeof CATEGORY_META[EventCategory]][]).map(([cat, meta]) => (
          <button key={cat}
            onClick={() => setFilterCat(cat === filterCat ? 'all' : cat)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
              filterCat === cat
                ? `${meta.bg} ${meta.color}`
                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}>
            {meta.label}
          </button>
        ))}
      </div>

      {/* View tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {([
          { id: 'month', label: 'Этот месяц' },
          { id: 'next',  label: 'Следующий'  },
          { id: 'year',  label: 'Весь год'   },
        ] as { id: ViewMode; label: string }[]).map((v) => (
          <button key={v.id} onClick={() => setViewMode(v.id)}
            className={`flex-1 rounded-lg py-2 text-sm transition-colors ${
              viewMode === v.id
                ? 'bg-white font-medium shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Month navigation */}
      {viewMode !== 'year' && (
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrentDate((d) => subMonths(d, 1))}
            className="rounded-lg border border-slate-200 px-4 py-1.5 text-sm hover:bg-slate-50">
            ←
          </button>
          <span className="font-medium text-slate-700 capitalize">
            {viewMode === 'month'
              ? format(currentDate,            'LLLL yyyy', { locale: ru })
              : format(addMonths(currentDate, 1), 'LLLL yyyy', { locale: ru })
            }
          </span>
          <button onClick={() => setCurrentDate((d) => addMonths(d, 1))}
            className="rounded-lg border border-slate-200 px-4 py-1.5 text-sm hover:bg-slate-50">
            →
          </button>
        </div>
      )}

      {/* Views */}
      {viewMode === 'month' && (
        <MonthView calendar={calendar} onDayClick={setSelectedDate} selectedDate={selectedDate} />
      )}
      {viewMode === 'next' && (
        <MonthView calendar={nextCalendar} onDayClick={setSelectedDate} selectedDate={selectedDate} />
      )}
      {viewMode === 'year' && (
        <YearView
          year={year}
          events={filtered}
          legalForm={legalForm}
          onMonthClick={(m) => { setCurrentDate(new Date(year, m, 1)); setViewMode('month') }}
        />
      )}

      {/* Selected day detail */}
      {selectedDate && selectedEvents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-slate-600">
            {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
          </h2>
          {selectedEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {/* Upcoming list */}
      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
          Ближайшие 30 дней
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-400">Нет предстоящих обязательств</p>
        ) : (
          <div className="space-y-3">
            {upcoming.slice(0, 10).map(({ event, date, daysUntil }) => (
              <div key={`${event.id}-${date.toISOString()}`} className="flex gap-3">
                <div className="min-w-[52px] rounded-lg bg-slate-50 p-2 text-center shrink-0">
                  <div className="text-xs text-slate-400">
                    {format(date, 'MMM', { locale: ru })}
                  </div>
                  <div className="text-lg font-bold text-slate-700">
                    {format(date, 'd')}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <EventCard event={event} daysUntil={daysUntil} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {lastCheck && (
        <p className="text-xs text-slate-300 text-right">
          Законодательство проверено: {new Date(lastCheck).toLocaleDateString('ru-RU')}
        </p>
      )}
    </div>
  )
}
