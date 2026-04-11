import { useState } from 'react'
import type { ChecklistItem } from '../../constants/lifecycle-events'

interface Props {
  items: ChecklistItem[]
  title?: string
}

export default function ChecklistCard({ items, title }: Props) {
  const [checked, setChecked] = useState<string[]>([])

  const toggle = (id: string) =>
    setChecked(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )

  const progress = items.length > 0
    ? Math.round((checked.length / items.length) * 100)
    : 0

  return (
    <div className="rounded-xl shadow-sm overflow-hidden"
      style={{ border: '1px solid var(--border)' }}>

      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <span className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}>
          {title ?? 'Чеклист действий'}
        </span>
        <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
          {checked.length}/{items.length} · {progress}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1" style={{ backgroundColor: 'var(--border)' }}>
        <div className="h-1 transition-all duration-300"
          style={{ width: `${progress}%`, backgroundColor: 'var(--accent)' }} />
      </div>

      {/* Items */}
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {items.map((item) => {
          const done = checked.includes(item.id)
          return (
            <div key={item.id}
              className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:opacity-80"
              style={{ backgroundColor: done ? 'var(--accent-light)' : 'var(--surface-card)' }}
              onClick={() => toggle(item.id)}>

              {/* Checkbox */}
              <div className="w-5 h-5 rounded shrink-0 mt-0.5 flex items-center justify-center"
                style={{
                  border: done ? 'none' : '1.5px solid var(--border-strong)',
                  backgroundColor: done ? 'var(--accent)' : 'transparent',
                }}>
                {done && <span className="text-white text-xs">✓</span>}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-medium ${done ? 'line-through' : ''}`}
                    style={{ color: done ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                    {item.title}
                  </p>
                  {item.isCritical && !done && (
                    <span className="rounded-full px-1.5 py-0.5 text-xs"
                      style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
                      Критично
                    </span>
                  )}
                  {item.isLegal && (
                    <span className="rounded-full px-1.5 py-0.5 text-xs"
                      style={{ backgroundColor: '#fffbeb', color: '#92400e' }}>
                      ⚖️ Юрист
                    </span>
                  )}
                </div>
                {!done && (
                  <>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {item.description}
                    </p>
                    <div className="flex gap-3 mt-1.5 flex-wrap">
                      {item.authority && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          📍 {item.authority}
                        </span>
                      )}
                      {item.deadline && (
                        <span className="text-xs font-medium" style={{ color: 'var(--danger)' }}>
                          ⏰ {item.deadline}
                        </span>
                      )}
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noreferrer"
                          className="text-xs underline"
                          style={{ color: 'var(--accent)' }}
                          onClick={(e) => e.stopPropagation()}>
                          Открыть →
                        </a>
                      )}
                    </div>
                    {item.penaltyIfMissed && (
                      <p className="text-xs mt-1 font-medium" style={{ color: 'var(--danger)' }}>
                        ⚠ Если пропустить: {item.penaltyIfMissed}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
