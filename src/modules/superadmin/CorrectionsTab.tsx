import { useEffect, useMemo, useState } from 'react'
import { useUserStore } from '../../store/userStore'
import { useCompaniesStore } from '../../store/companiesStore'
import {
  useLegislationStore,
  type CorrectionReport,
  type CorrectionStatus,
} from '../../store/legislationStore'
import type { CorrectionDiff } from '../../lib/correctionEngine'

const T = {
  ru: {
    title: 'Корректировки',
    subtitle: 'Непотверждённые последствия изменений налоговых ставок',
    noActiveCompany: 'Не выбрана активная компания',
    empty: 'Нет корректировок для этой компании',
    refresh: '↻ Обновить',
    loading: 'Загрузка...',
    statusPending: 'На рассмотрении',
    statusConfirmed: 'Подтверждено',
    statusDismissed: 'Отклонено',
    affectedPeriod: 'Затронутый период',
    rateKey: 'Ключ ставки',
    oldValue: 'Старое значение',
    newValue: 'Новое значение',
    totalDifference: 'Общая разница',
    diffsTable: 'Детализация',
    colPeriod: 'Период',
    colField: 'Поле',
    colOld: 'Старая сумма',
    colNew: 'Новая сумма',
    colDiff: 'Разница',
    confirm: 'Подтвердить корректировку',
    dismiss: 'Отклонить',
    confirmed: '✓ Корректирующая проводка создана',
    dismissPrompt: 'Укажите причину отклонения',
    warnings: 'Предупреждения',
    onlyWarnings:
      'Все строки содержат только предупреждения — проводка не создаётся, только отметка о рассмотрении.',
    errorPrefix: 'Ошибка',
    saving: 'Сохранение...',
  },
  en: {
    title: 'Corrections',
    subtitle: 'Unconfirmed impact of tax rate changes',
    noActiveCompany: 'No active company selected',
    empty: 'No corrections for this company',
    refresh: '↻ Refresh',
    loading: 'Loading...',
    statusPending: 'Pending',
    statusConfirmed: 'Confirmed',
    statusDismissed: 'Dismissed',
    affectedPeriod: 'Affected period',
    rateKey: 'Rate key',
    oldValue: 'Old value',
    newValue: 'New value',
    totalDifference: 'Total difference',
    diffsTable: 'Breakdown',
    colPeriod: 'Period',
    colField: 'Field',
    colOld: 'Old amount',
    colNew: 'New amount',
    colDiff: 'Difference',
    confirm: 'Confirm correction',
    dismiss: 'Dismiss',
    confirmed: '✓ Correction entry created',
    dismissPrompt: 'Provide a reason for dismissal',
    warnings: 'Warnings',
    onlyWarnings:
      'All rows are warning-only — no journal entry is posted, only marked reviewed.',
    errorPrefix: 'Error',
    saving: 'Saving...',
  },
  bg: {
    title: 'Корекции',
    subtitle: 'Непотвърдени последици от промени в данъчни ставки',
    noActiveCompany: 'Няма избрана активна компания',
    empty: 'Няма корекции за тази компания',
    refresh: '↻ Обнови',
    loading: 'Зареждане...',
    statusPending: 'В очакване',
    statusConfirmed: 'Потвърдено',
    statusDismissed: 'Отхвърлено',
    affectedPeriod: 'Засегнат период',
    rateKey: 'Ключ на ставка',
    oldValue: 'Стара стойност',
    newValue: 'Нова стойност',
    totalDifference: 'Обща разлика',
    diffsTable: 'Разбивка',
    colPeriod: 'Период',
    colField: 'Поле',
    colOld: 'Стара сума',
    colNew: 'Нова сума',
    colDiff: 'Разлика',
    confirm: 'Потвърди корекция',
    dismiss: 'Отхвърли',
    confirmed: '✓ Корекционна проводка създадена',
    dismissPrompt: 'Посочете причина за отхвърлянето',
    warnings: 'Предупреждения',
    onlyWarnings:
      'Всички редове са само предупреждения — проводка не се създава, само се маркира като разгледана.',
    errorPrefix: 'Грешка',
    saving: 'Запазване...',
  },
  uk: {
    title: 'Коригування',
    subtitle: 'Непідтверджені наслідки змін податкових ставок',
    noActiveCompany: 'Не обрано активну компанію',
    empty: 'Немає коригувань для цієї компанії',
    refresh: '↻ Оновити',
    loading: 'Завантаження...',
    statusPending: 'На розгляді',
    statusConfirmed: 'Підтверджено',
    statusDismissed: 'Відхилено',
    affectedPeriod: 'Вражений період',
    rateKey: 'Ключ ставки',
    oldValue: 'Старе значення',
    newValue: 'Нове значення',
    totalDifference: 'Загальна різниця',
    diffsTable: 'Розбивка',
    colPeriod: 'Період',
    colField: 'Поле',
    colOld: 'Стара сума',
    colNew: 'Нова сума',
    colDiff: 'Різниця',
    confirm: 'Підтвердити коригування',
    dismiss: 'Відхилити',
    confirmed: '✓ Коригувальна проводка створена',
    dismissPrompt: 'Вкажіть причину відхилення',
    warnings: 'Попередження',
    onlyWarnings:
      'Усі рядки містять лише попередження — проводка не створюється, лише відмітка про розгляд.',
    errorPrefix: 'Помилка',
    saving: 'Збереження...',
  },
}

function statusColors(status: CorrectionStatus): { bg: string; fg: string } {
  switch (status) {
    case 'pending':
      return { bg: '#fef3c7', fg: '#b45309' }
    case 'confirmed':
      return { bg: '#dcfce7', fg: '#15803d' }
    case 'dismissed':
      return { bg: '#e5e7eb', fg: '#4b5563' }
  }
}

function formatNum(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function CorrectionsTab() {
  const language = useUserStore(s => s.language) || 'ru'
  const labels = T[language] ?? T.ru

  const activeCompanyId = useCompaniesStore(s => s.activeCompanyId)
  const {
    corrections,
    loadCorrectionReports,
    confirmCorrection,
    dismissCorrection,
  } = useLegislationStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const load = async () => {
    if (!activeCompanyId) return
    setLoading(true)
    await loadCorrectionReports(activeCompanyId)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId])

  const companyCorrections = useMemo(
    () =>
      activeCompanyId
        ? corrections.filter(c => c.company_id === activeCompanyId)
        : [],
    [corrections, activeCompanyId],
  )

  if (!activeCompanyId) {
    return (
      <div className="max-w-4xl">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {labels.noActiveCompany}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {labels.title}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {labels.subtitle}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg disabled:opacity-50"
          style={{
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          {loading ? '...' : labels.refresh}
        </button>
      </div>

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
        >
          {labels.errorPrefix}: {error}
        </div>
      )}

      {flash && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: '#dcfce7', color: '#15803d' }}
        >
          {flash}
        </div>
      )}

      {loading && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {labels.loading}
        </p>
      )}

      {!loading && companyCorrections.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {labels.empty}
        </p>
      )}

      <div className="space-y-3">
        {companyCorrections.map(report => (
          <CorrectionCard
            key={report.id}
            report={report}
            labels={labels}
            onConfirm={async () => {
              setError(null)
              setFlash(null)
              const err = await confirmCorrection(report.id)
              if (err) setError(err)
              else setFlash(labels.confirmed)
            }}
            onDismiss={async () => {
              const reason = window.prompt(labels.dismissPrompt) ?? ''
              if (!reason) return
              setError(null)
              setFlash(null)
              const err = await dismissCorrection(report.id, reason)
              if (err) setError(err)
            }}
          />
        ))}
      </div>
    </div>
  )
}

function CorrectionCard({
  report,
  labels,
  onConfirm,
  onDismiss,
}: {
  report: CorrectionReport
  labels: (typeof T)['ru']
  onConfirm: () => void
  onDismiss: () => void
}) {
  const sc = statusColors(report.status)
  const statusLabel =
    report.status === 'pending'
      ? labels.statusPending
      : report.status === 'confirmed'
        ? labels.statusConfirmed
        : labels.statusDismissed

  const diffs: CorrectionDiff[] = report.difference_json?.diffs ?? []
  const warningDiffs = diffs.filter(d => d.warning)
  const numericDiffs = diffs.filter(d => d.difference !== 0 || d.oldAmount !== 0 || d.newAmount !== 0)
  const onlyWarnings = diffs.length > 0 && diffs.every(d => d.difference === 0)

  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: sc.bg, color: sc.fg }}
            >
              {statusLabel}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {new Date(report.created_at).toLocaleString()}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-y-1 gap-x-4 text-xs">
            <Row label={labels.rateKey}>
              <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                {report.trigger_rate_key ?? '—'}
              </span>
            </Row>
            <Row label={labels.affectedPeriod}>
              <span style={{ color: 'var(--text-primary)' }}>
                {report.affected_from} — {report.affected_to}
              </span>
            </Row>
            <Row label={labels.oldValue}>
              <span className="tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {report.old_values_json.oldValue}
              </span>
            </Row>
            <Row label={labels.newValue}>
              <span className="tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {report.new_values_json.newValue}
              </span>
            </Row>
            <Row label={labels.totalDifference}>
              <span
                className="tabular-nums font-semibold"
                style={{
                  color:
                    report.total_difference > 0
                      ? '#dc2626'
                      : report.total_difference < 0
                        ? '#15803d'
                        : 'var(--text-primary)',
                }}
              >
                {report.total_difference > 0 ? '+' : ''}
                {formatNum(report.total_difference)} €
              </span>
            </Row>
          </div>
        </div>

        {report.status === 'pending' && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onConfirm}
              className="rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{ backgroundColor: '#15803d', color: 'white' }}
            >
              {labels.confirm}
            </button>
            <button
              onClick={onDismiss}
              className="rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              {labels.dismiss}
            </button>
          </div>
        )}
      </div>

      {numericDiffs.length > 0 && (
        <div
          className="mt-3 rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          <div
            className="text-xs font-medium px-3 py-2"
            style={{
              backgroundColor: 'var(--surface)',
              color: 'var(--text-secondary)',
            }}
          >
            {labels.diffsTable}
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: 'var(--surface)' }}>
                <th className="text-left px-3 py-1.5" style={{ color: 'var(--text-muted)' }}>
                  {labels.colPeriod}
                </th>
                <th className="text-left px-3 py-1.5" style={{ color: 'var(--text-muted)' }}>
                  {labels.colField}
                </th>
                <th className="text-right px-3 py-1.5" style={{ color: 'var(--text-muted)' }}>
                  {labels.colOld}
                </th>
                <th className="text-right px-3 py-1.5" style={{ color: 'var(--text-muted)' }}>
                  {labels.colNew}
                </th>
                <th className="text-right px-3 py-1.5" style={{ color: 'var(--text-muted)' }}>
                  {labels.colDiff}
                </th>
              </tr>
            </thead>
            <tbody>
              {numericDiffs.map((d, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-3 py-1.5" style={{ color: 'var(--text-primary)' }}>
                    {d.period}
                  </td>
                  <td
                    className="px-3 py-1.5 font-mono"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {d.affectedField}
                  </td>
                  <td
                    className="px-3 py-1.5 text-right tabular-nums"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {formatNum(d.oldAmount)}
                  </td>
                  <td
                    className="px-3 py-1.5 text-right tabular-nums"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {formatNum(d.newAmount)}
                  </td>
                  <td
                    className="px-3 py-1.5 text-right tabular-nums font-semibold"
                    style={{
                      color:
                        d.difference > 0 ? '#dc2626' : d.difference < 0 ? '#15803d' : 'var(--text-primary)',
                    }}
                  >
                    {d.difference > 0 ? '+' : ''}
                    {formatNum(d.difference)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {warningDiffs.length > 0 && (
        <div className="mt-3 space-y-1">
          <p
            className="text-xs font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            {labels.warnings}
          </p>
          {warningDiffs.map((d, i) => (
            <div
              key={i}
              className="rounded-lg px-3 py-2 text-xs"
              style={{ backgroundColor: '#fef3c7', color: '#b45309' }}
            >
              <span className="font-mono mr-2">{d.affectedField}</span>
              {d.warning}
            </div>
          ))}
        </div>
      )}

      {onlyWarnings && (
        <p
          className="text-xs mt-2 italic"
          style={{ color: 'var(--text-muted)' }}
        >
          {labels.onlyWarnings}
        </p>
      )}

      {report.dismiss_reason && (
        <p
          className="text-xs italic mt-2"
          style={{ color: 'var(--text-muted)' }}
        >
          {report.dismiss_reason}
        </p>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>
        {label}:
      </span>
      <span className="truncate">{children}</span>
    </div>
  )
}
