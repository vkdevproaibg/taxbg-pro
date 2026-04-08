import type { CalendarMonth } from '../../lib/calendarUtils'
import { CATEGORY_META } from '../../constants/calendar-events'

interface Props {
  calendar: CalendarMonth
  onDayClick: (date: Date) => void
  selectedDate: Date | null
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export default function MonthView({ calendar, onDayClick, selectedDate }: Props) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-100">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-slate-400">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {calendar.days.map((day, i) => {
          const isSelected = selectedDate?.toDateString() === day.date.toDateString()

          return (
            <button key={i} onClick={() => onDayClick(day.date)}
              className={`
                min-h-[72px] p-1.5 text-left border-b border-r border-slate-50
                hover:bg-slate-50 transition-colors
                ${!day.isCurrentMonth ? 'opacity-30' : ''}
                ${day.isToday ? 'bg-violet-50' : ''}
                ${isSelected ? 'ring-2 ring-inset ring-violet-400' : ''}
              `}>
              <div className={`
                text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                ${day.isToday ? 'bg-violet-600 text-white' : 'text-slate-600'}
              `}>
                {day.date.getDate()}
              </div>
              <div className="space-y-0.5">
                {day.events.slice(0, 2).map((event) => {
                  const meta = CATEGORY_META[event.category]
                  return (
                    <div key={event.id}
                      className={`rounded px-1 py-0.5 text-xs truncate border ${meta.bg} ${meta.color}`}>
                      {event.title_ru}
                    </div>
                  )
                })}
                {day.events.length > 2 && (
                  <div className="text-xs text-slate-400 pl-1">
                    +{day.events.length - 2}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
