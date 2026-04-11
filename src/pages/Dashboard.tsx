import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../store/userStore'
import { useEntryAuditStore } from '../store/entryAuditStore'
import { useAccountingStore } from '../store/accountingStore'
import { useEmployeesStore } from '../store/employeesStore'
import { useCompaniesStore } from '../store/companiesStore'
import { useLegislationStore } from '../store/legislationStore'
import { CALENDAR_EVENTS_2026 } from '../constants/calendar-events'
import { TAX_RATES_2026 } from '../constants/tax-rates-2026'
import { buildAuditReport } from '../lib/riskEngine'
import { getUpcomingEvents } from '../lib/calendarUtils'
import { format } from 'date-fns'
import { useT } from '../lib/useT'
import { getDateLocale } from '../lib/calendarUtils'
import { useDataReadiness } from '../lib/dataReadiness'

const LEGAL_LABELS = { ood: 'ООД', et: 'ЕТ', self: 'Самоосигуряващ' }

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2).replace(/\.?0+$/, '')}%`
}

export default function Dashboard() {
  const { legalForm, companyName, taxPeriod, hasVat, hasEmployees, eik, language } = useUserStore()
  const t = useT()
  const readiness = useDataReadiness()
  const transactions = useAccountingStore((s) => s.transactions)
  const employees    = useEmployeesStore((s) => s.employees)
  const activeCompanyId = useCompaniesStore((s) => s.activeCompanyId)
  const pendingCorrectionsCount = useLegislationStore((s) =>
    activeCompanyId ? s.getPendingCorrectionsCount(activeCompanyId) : 0,
  )
  const navigate     = useNavigate()
  const r            = TAX_RATES_2026

  const upcoming = useMemo(
    () => getUpcomingEvents(CALENDAR_EVENTS_2026, legalForm, 14),
    [legalForm]
  )

  const report = useMemo(() =>
    buildAuditReport({ legalForm, companyName, taxPeriod, hasVat, hasEmployees, transactions, employees, eik, pendingCorrectionsCount }),
    [legalForm, companyName, taxPeriod, hasVat, hasEmployees, transactions, employees, eik, pendingCorrectionsCount]
  )

  const { getUnresolvedCritical, auditCompleted, path: entryPath, entryDate } = useEntryAuditStore()
  const unresolvedCritical = getUnresolvedCritical()

  const totalIn  = transactions
    .filter((t) => ['income','vat_out','appstore','googleplay','stripe'].includes(t.type))
    .reduce((s, t) => s + t.amount, 0)
  const totalOut = transactions
    .filter((t) => ['expense','vat_in','salary','dividend','depreciation','vehicle_tax','vehicle_expense'].includes(t.type))
    .reduce((s, t) => s + t.amount * (t.type === 'vehicle_expense' ? (t.deductiblePercent ?? 0.5) : 1), 0)

  return (
    <div className="space-y-6 p-6">

      {/* Audit banners */}
      {entryPath === 'existing' && !auditCompleted && unresolvedCritical.length > 0 && (
        <div className="rounded-xl p-4 flex items-center justify-between gap-3"
          style={{ backgroundColor: 'var(--danger-light)', border: '1.5px solid var(--danger)' }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--danger-text)' }}>
              🔴 Незакрытые обязательства до входа в систему
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--danger-text)' }}>
              Критично: {unresolvedCritical.length} · Риск штрафов: до{' '}
              {unresolvedCritical.reduce((s, i) => s + (i.penaltyMax ?? 0), 0).toLocaleString()} €
            </p>
          </div>
          <button
            onClick={() => navigate('/audit-entry')}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white shrink-0"
            style={{ backgroundColor: 'var(--danger)' }}>
            Закрыть →
          </button>
        </div>
      )}

      {entryPath === 'existing' && auditCompleted && (
        <div className="rounded-xl p-3 flex items-center gap-3"
          style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
          <span>✅</span>
          <p className="text-sm" style={{ color: 'var(--accent-text)' }}>
            Аудит входа завершён · Система ведёт учёт с {entryDate}
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {companyName || t('page_dashboard')}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-text)' }}>
              🇧🇬 {LEGAL_LABELS[legalForm]}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {taxPeriod}
            </span>
          </div>
        </div>
      </div>

      {/* Audit risk widget — only when data is ready */}
      {readiness.isReady && report.totalCount > 0 && (
        <div
          className="rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
          style={{
            border: `1px solid ${report.criticalCount > 0 ? 'var(--danger)' : '#f59e0b'}`,
            backgroundColor: report.criticalCount > 0 ? 'var(--danger-light)' : '#fffbeb',
          }}
          onClick={() => navigate('/auditor')}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {report.criticalCount > 0 ? '🚨' : '⚠️'}
              </span>
              <div>
                <p className="font-semibold text-sm"
                  style={{ color: report.criticalCount > 0 ? 'var(--danger-text)' : '#92400e' }}>
                  {report.criticalCount > 0
                    ? `${report.criticalCount} критических риска — требуют внимания`
                    : `${report.totalCount} замечаний аудитора`}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Индекс здоровья: {report.healthScore}/100 · нажмите для деталей →
                </p>
              </div>
            </div>
          </div>
          {report.risks.slice(0, 2).map((risk) => (
            <div key={risk.id} className="mt-2 flex items-center gap-2 text-xs"
              style={{ color: 'var(--text-secondary)' }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: risk.level === 'critical' ? 'var(--danger)' : '#f59e0b' }} />
              {risk.title}
            </div>
          ))}
        </div>
      )}

      {/* Auditor placeholder — shown until data is configured */}
      {!readiness.isReady && (
        <div className="rounded-xl p-4"
          style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                Аудитор готов к работе
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Введите данные компании — аудитор начнёт анализировать риски
              </p>
            </div>
          </div>
          {readiness.missingSteps.length > 0 && (
            <div className="mt-3 space-y-1">
              {readiness.missingSteps.map((step, i) => (
                <p key={i} className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  · {step}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Key rates */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Корпоративен данък', value: formatPercent(r.corporateTax.value) },
          { label: 'Данък дивиденти',    value: formatPercent(r.dividendTax.value) },
          { label: 'ДДС стандартен',     value: formatPercent(r.vat.value) },
          { label: 'МРЗ 2026',           value: `${r.minWage.value} €` },
        ].map((item) => (
          <div key={item.label} className="rounded-xl p-4 shadow-sm"
            style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
              {item.value}
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* Accounting summary */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t('label_income'),  value: totalIn,            positive: true  },
            { label: t('label_expense'),  value: totalOut,           positive: false },
            { label: t('label_result'), value: totalIn - totalOut, positive: totalIn >= totalOut },
          ].map((item) => (
            <div key={item.label} className="rounded-xl p-4 shadow-sm"
              style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
              <div className="text-xl font-bold"
                style={{ color: item.positive ? 'var(--accent)' : 'var(--danger)' }}>
                {item.value.toFixed(2)} €
              </div>
              <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming deadlines */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}>
          {t('dashboard_upcoming')}
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('dashboard_no_deadlines')}
          </p>
        ) : (
          <div className="space-y-2">
            {upcoming.slice(0, 5).map(({ event, date, daysUntil }) => (
              <div key={`${event.id}-${date.toISOString()}`}
                className="flex items-start gap-3 rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}
                onClick={() => navigate('/calendar')}>
                <div className="min-w-[48px] rounded-lg p-2 text-center shrink-0"
                  style={{ backgroundColor: 'var(--accent-light)' }}>
                  <div className="text-xs" style={{ color: 'var(--accent)' }}>
                    {format(date, 'MMM', { locale: getDateLocale(language) })}
                  </div>
                  <div className="text-lg font-bold" style={{ color: 'var(--accent-text)' }}>
                    {format(date, 'd')}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                    {event.title_ru}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {event.authority}
                  </div>
                </div>
                <div className="shrink-0">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    daysUntil <= 3
                      ? 'bg-red-100 text-red-700'
                      : daysUntil <= 7
                      ? 'bg-amber-100 text-amber-700'
                      : ''
                  }`}
                  style={daysUntil > 7 ? { backgroundColor: 'var(--accent-light)', color: 'var(--accent-text)' } : {}}>
                    {daysUntil === 0 ? 'Сегодня' : `${daysUntil} дн.`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
