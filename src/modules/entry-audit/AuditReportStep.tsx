import { useEntryAuditStore } from '../../store/entryAuditStore'
import type { AuditIssue } from '../../store/entryAuditStore'

const LEVEL_META = {
  critical:  { icon: '🔴', label: 'Критично',         color: 'var(--danger)',  bg: 'var(--danger-light)',  border: 'var(--danger)'  },
  important: { icon: '🟡', label: 'Важно',             color: '#92400e',        bg: '#fffbeb',              border: '#f59e0b'        },
  attention: { icon: '🟠', label: 'Обратить внимание', color: '#9a3412',        bg: '#fff7ed',              border: '#f97316'        },
  ok:        { icon: '✅', label: 'В порядке',         color: 'var(--accent)',  bg: 'var(--accent-light)', border: 'var(--accent)'  },
}

function IssueCard({ issue }: { issue: AuditIssue }) {
  const meta = LEVEL_META[issue.level]
  return (
    <div className="rounded-xl overflow-hidden"
      style={{ border: `1.5px solid ${meta.border}` }}>
      <div className="px-4 py-3" style={{ backgroundColor: meta.bg }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span>{meta.icon}</span>
            <span className="font-semibold text-sm" style={{ color: meta.color }}>
              {issue.title}
            </span>
          </div>
          {(issue.penaltyMin ?? 0) > 0 && (
            <span className="text-sm font-bold" style={{ color: meta.color }}>
              Штраф: {issue.penaltyMin?.toLocaleString()} €
              {issue.penaltyMax && issue.penaltyMax !== issue.penaltyMin
                ? `–${issue.penaltyMax.toLocaleString()} €`
                : ''}
            </span>
          )}
        </div>
        <p className="text-xs mt-1" style={{ color: meta.color }}>
          {issue.description}
        </p>
        {issue.legalBasis && (
          <p className="text-xs mt-0.5 opacity-70" style={{ color: meta.color }}>
            {issue.legalBasis}
          </p>
        )}
      </div>
    </div>
  )
}

export default function AuditReportStep({ onNext }: { onNext: () => void }) {
  const { issues } = useEntryAuditStore()

  const critical  = issues.filter(i => i.level === 'critical')
  const important = issues.filter(i => i.level === 'important')
  const attention = issues.filter(i => i.level === 'attention')
  const allOk     = issues.every(i => i.level === 'ok')

  const totalPenaltyMin = issues.reduce((s, i) => s + (i.penaltyMin ?? 0), 0)
  const totalPenaltyMax = issues.reduce((s, i) => s + (i.penaltyMax ?? 0), 0)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Результаты аудита
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Обнаружено незакрытых обязательств: {issues.filter(i => i.level !== 'ok').length}
        </p>
      </div>

      {!allOk && (
        <div className="rounded-xl p-4"
          style={{ backgroundColor: 'var(--danger-light)', border: '1.5px solid var(--danger)' }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--danger-text)' }}>
                Суммарный риск штрафов
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--danger-text)' }}>
                {critical.length} критичных · {important.length} важных · {attention.length} требуют внимания
              </p>
            </div>
            <p className="text-xl font-bold" style={{ color: 'var(--danger)' }}>
              {totalPenaltyMin.toLocaleString()} €
              {totalPenaltyMax > totalPenaltyMin
                ? `–${totalPenaltyMax.toLocaleString()} €`
                : ''}
            </p>
          </div>
        </div>
      )}

      {allOk && (
        <div className="rounded-xl p-4"
          style={{ backgroundColor: 'var(--accent-light)', border: '1.5px solid var(--accent)' }}>
          <p className="font-semibold text-sm" style={{ color: 'var(--accent-text)' }}>
            ✅ Незакрытых обязательств не обнаружено
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--accent-text)' }}>
            Можно сразу переходить к вводу начальных остатков и началу работы.
          </p>
        </div>
      )}

      {critical.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'var(--danger)' }}>
            🔴 Критично — требует немедленного закрытия
          </h3>
          <div className="space-y-2">
            {critical.map(i => <IssueCard key={i.id} issue={i} />)}
          </div>
        </div>
      )}

      {important.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: '#92400e' }}>
            🟡 Важно — закрыть в течение месяца
          </h3>
          <div className="space-y-2">
            {important.map(i => <IssueCard key={i.id} issue={i} />)}
          </div>
        </div>
      )}

      {attention.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: '#9a3412' }}>
            🟠 Обратить внимание
          </h3>
          <div className="space-y-2">
            {attention.map(i => <IssueCard key={i.id} issue={i} />)}
          </div>
        </div>
      )}

      <button
        onClick={onNext}
        className="w-full rounded-xl py-3 text-sm font-semibold text-white"
        style={{ backgroundColor: 'var(--accent)' }}>
        Перейти к плану закрытия →
      </button>
    </div>
  )
}
