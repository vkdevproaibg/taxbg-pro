import { useState } from 'react'
import { useEntryAuditStore } from '../../store/entryAuditStore'
import type { AuditIssue, AuditAction } from '../../store/entryAuditStore'

function ActionItem({ action, resolved }: { action: AuditAction; resolved: boolean }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0"
      style={{ borderColor: 'var(--border)' }}>
      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
        style={{
          backgroundColor: resolved ? 'var(--accent)' : 'var(--surface)',
          color: resolved ? '#fff' : 'var(--text-muted)',
          border: resolved ? 'none' : '1.5px solid var(--border)',
        }}>
        {resolved ? '✓' : action.order}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {action.title}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {action.description}
        </p>
        <div className="flex gap-2 mt-2 flex-wrap">
          {action.link && (
            <a href={action.link} target="_blank" rel="noreferrer"
              className="rounded-lg px-3 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: 'var(--accent)' }}>
              Открыть →
            </a>
          )}
          {action.deadline && (
            <span className="rounded-lg px-3 py-1 text-xs"
              style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger-text)' }}>
              Срок: {action.deadline}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function IssueClosureCard({ issue }: { issue: AuditIssue }) {
  const { resolvedIssues, resolveIssue } = useEntryAuditStore()
  const resolved = resolvedIssues.includes(issue.id)

  const LEVEL_COLORS = {
    critical:  { color: 'var(--danger)',  bg: 'var(--danger-light)' },
    important: { color: '#92400e',        bg: '#fffbeb'             },
    attention: { color: '#9a3412',        bg: '#fff7ed'             },
    ok:        { color: 'var(--accent)',  bg: 'var(--accent-light)' },
  }
  const meta = LEVEL_COLORS[issue.level]

  return (
    <div className="rounded-xl overflow-hidden"
      style={{
        border: resolved ? '1.5px solid var(--accent)' : '1px solid var(--border)',
        opacity: resolved ? 0.7 : 1,
      }}>
      <div className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: resolved ? 'var(--accent-light)' : meta.bg }}>
        <span className="font-semibold text-sm"
          style={{ color: resolved ? 'var(--accent-text)' : meta.color }}>
          {resolved ? '✅ ' : ''}{issue.title}
        </span>
        {!resolved && (
          <button onClick={() => resolveIssue(issue.id)}
            className="rounded-xl px-3 py-1.5 text-xs font-medium text-white"
            style={{ backgroundColor: 'var(--accent)' }}>
            Отметить закрытым ✓
          </button>
        )}
      </div>

      {!resolved && issue.actions.length > 0 && (
        <div className="divide-y px-4"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-card)' }}>
          {issue.actions.map((action) => (
            <ActionItem key={action.order} action={action} resolved={resolved} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ClosurePlanStep({ onNext }: { onNext: () => void }) {
  const { issues, resolvedIssues, skipAudit, setEntryDate } = useEntryAuditStore()
  const [entryDateInput, setEntryDateInput] = useState(
    new Date().toISOString().slice(0, 10)
  )

  const activeIssues  = issues.filter(i => i.level !== 'ok')
  const allResolved   = activeIssues.every(i => resolvedIssues.includes(i.id))
  const resolvedCount = activeIssues.filter(i => resolvedIssues.includes(i.id)).length

  const handleComplete = () => {
    setEntryDate(entryDateInput)
    onNext()
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          План закрытия
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Выполните все пункты — затем начните работу в системе
        </p>
      </div>

      {/* Progress */}
      {activeIssues.length > 0 && (
        <div className="rounded-xl p-4"
          style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Прогресс закрытия
            </span>
            <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
              {resolvedCount} / {activeIssues.length}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
            <div className="h-2 rounded-full transition-all"
              style={{
                width: `${activeIssues.length > 0
                  ? (resolvedCount / activeIssues.length) * 100 : 100}%`,
                backgroundColor: 'var(--accent)',
              }} />
          </div>
        </div>
      )}

      {/* Issues list */}
      <div className="space-y-3">
        {activeIssues.length === 0 ? (
          <div className="rounded-xl p-4 text-center"
            style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--accent-text)' }}>
              ✅ Обязательств для закрытия нет
            </p>
          </div>
        ) : (
          activeIssues.map(i => <IssueClosureCard key={i.id} issue={i} />)
        )}
      </div>

      {/* Entry date */}
      {(allResolved || activeIssues.length === 0) && (
        <div className="rounded-xl p-4 space-y-3"
          style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
          <div>
            <label className="block text-sm font-medium mb-1"
              style={{ color: 'var(--text-primary)' }}>
              Дата начала работы в системе
            </label>
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              С этой даты TaxBG Pro ведёт учёт и отвечает за корректность данных
            </p>
            <input type="date"
              value={entryDateInput}
              onChange={(e) => setEntryDateInput(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm outline-none"
              style={{
                border: '1.5px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {(allResolved || activeIssues.length === 0) && (
          <button onClick={handleComplete}
            className="flex-1 rounded-xl py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--accent)' }}>
            Перейти к вводу остатков →
          </button>
        )}
        <button onClick={() => { skipAudit(); onNext() }}
          className="rounded-xl px-4 py-3 text-sm"
          style={{ border: '1.5px solid var(--border)', color: 'var(--text-muted)' }}>
          Пропустить (с рисками)
        </button>
      </div>

      {!allResolved && activeIssues.length > 0 && (
        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          Отметьте все пункты закрытыми чтобы продолжить без рисков
        </p>
      )}
    </div>
  )
}
