import type { CalendarEvent } from '../../constants/calendar-events'
import { CATEGORY_META } from '../../constants/calendar-events'

interface Props {
  event: CalendarEvent
  daysUntil?: number
  daysOverdue?: number
  compact?: boolean
}

export default function EventCard({ event, daysUntil, daysOverdue, compact }: Props) {
  const meta = CATEGORY_META[event.category]

  const urgencyClass =
    daysOverdue !== undefined                             ? 'border-red-300 bg-red-50' :
    daysUntil !== undefined && daysUntil <= 3             ? 'border-red-300 bg-red-50' :
    daysUntil !== undefined && daysUntil <= 7             ? 'border-amber-300 bg-amber-50' :
    daysUntil !== undefined && daysUntil <= 14            ? 'border-yellow-200 bg-yellow-50' :
    meta.bg

  if (compact) {
    return (
      <div className={`rounded px-1.5 py-0.5 text-xs font-medium border truncate ${urgencyClass} ${meta.color}`}>
        {event.title_ru}
      </div>
    )
  }

  return (
    <div className={`rounded-xl border p-4 space-y-2 w-full ${urgencyClass}`}>
      <div className="flex items-start gap-2 flex-wrap">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium border shrink-0 ${meta.bg} ${meta.color}`}>
          {meta.label}
        </span>
        <span className="text-xs text-slate-400 shrink-0">{event.authority}</span>
        {daysOverdue !== undefined && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            Просрочено {daysOverdue} дн.
          </span>
        )}
        {daysUntil !== undefined && daysUntil <= 7 && daysUntil >= 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            Через {daysUntil === 0 ? 'сегодня' : `${daysUntil} дн.`}
          </span>
        )}
      </div>

      <p className="font-medium text-slate-800">{event.title_ru}</p>
      <p className="text-xs text-slate-500 leading-relaxed">{event.description_ru}</p>

      <div className="flex items-center justify-between pt-1 border-t border-slate-100 flex-wrap gap-2">
        <span className="text-xs text-red-500">{event.penaltyInfo_ru}</span>
        <div className="flex gap-3">
          {event.links.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noreferrer"
              className="text-xs text-violet-500 underline hover:text-violet-700">
              {link.label}
            </a>
          ))}
        </div>
      </div>

      <div className="text-xs text-slate-300 space-y-0.5">
        <p>{event.legalBasis} · {event.dv}</p>
        <p>
          Опубликовано: {event.publishedAt}
          {event.publishedAt !== event.effectiveFrom &&
            ` · В силе с: ${event.effectiveFrom}`}
          {event.effectiveTo && ` · До: ${event.effectiveTo}`}
        </p>
        <p>Версия {event.version} · проверено {event.lastVerified}</p>
      </div>
    </div>
  )
}
