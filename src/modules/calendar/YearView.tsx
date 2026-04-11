import { format } from 'date-fns'
import { buildCalendarMonth, getDateLocale } from '../../lib/calendarUtils'
import type { CalendarEvent } from '../../constants/calendar-events'
import { CATEGORY_META } from '../../constants/calendar-events'
import type { LegalForm } from '../../store/userStore'
import { useUserStore } from '../../store/userStore'

interface Props {
  year: number
  events: CalendarEvent[]
  legalForm: LegalForm
  onMonthClick: (month: number) => void
}

export default function YearView({ year, events, legalForm, onMonthClick }: Props) {
  const language = useUserStore((s) => s.language)
  const locale = getDateLocale(language)
  const months = Array.from({ length: 12 }, (_, i) =>
    buildCalendarMonth(year, i, events, legalForm, locale)
  )

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {months.map((month, i) => (
        <button key={i} onClick={() => onMonthClick(i)}
          className="rounded-xl border border-slate-100 bg-white p-4 text-left shadow-sm hover:border-violet-300 transition-colors">
          <div className="font-medium text-slate-700 capitalize mb-3">
            {format(new Date(year, i, 1), 'LLLL', { locale })}
          </div>
          <div className="space-y-1.5">
            {month.events.length === 0 ? (
              <p className="text-xs text-slate-300">Нет обязательств</p>
            ) : (
              month.events.slice(0, 4).map((event) => {
                const meta = CATEGORY_META[event.category]
                const day  = event.recurrence === 'monthly'
                  ? `до ${event.dayOfMonth}-го`
                  : event.day
                    ? `${event.day}.${String(event.month).padStart(2, '0')}`
                    : ''
                return (
                  <div key={event.id} className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium border shrink-0 ${meta.bg} ${meta.color}`}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-slate-500 truncate flex-1">{event.title_ru}</span>
                    <span className="text-xs text-slate-300 shrink-0">{day}</span>
                  </div>
                )
              })
            )}
            {month.events.length > 4 && (
              <p className="text-xs text-slate-400">+{month.events.length - 4} ещё</p>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
