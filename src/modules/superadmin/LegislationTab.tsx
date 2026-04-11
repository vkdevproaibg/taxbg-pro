import { useEffect, useMemo, useState } from 'react'
import { useUserStore } from '../../store/userStore'
import {
  useLegislationStore,
  type LegislationAlert,
  type LegislationStatus,
} from '../../store/legislationStore'

const T = {
  ru: {
    title: 'Законодательство',
    subtitle: 'Мониторинг изменений в налоговом законодательстве',
    pendingLabel: 'На рассмотрении',
    addManual: 'Добавить вручную',
    empty: 'Пока нет алертов. Добавьте первый вручную.',
    loading: 'Загрузка...',
    source: 'Источник',
    affectedKeys: 'Затронутые ставки',
    review: 'Разобрать',
    dismiss: 'Отклонить',
    apply: 'Применить изменение',
    statusPending: 'На рассмотрении',
    statusReviewing: 'В работе',
    statusApplied: 'Применено',
    statusDismissed: 'Отклонено',
    modalApplyTitle: 'Применение изменения ставки',
    rateKey: 'Ключ ставки',
    newValue: 'Новое значение',
    effectiveFrom: 'Действует с',
    effectiveTo: 'Действует по',
    legalBasis: 'Нормативное основание',
    dvIssue: 'Номер ДВ',
    notesBg: 'Заметка (BG)',
    notesRu: 'Заметка (RU)',
    cancel: 'Отмена',
    confirmApply: 'Подтвердить и применить',
    retroactiveWarning: '⚠ Ретроактивное изменение! Затронет уже прошедшие периоды.',
    modalAddTitle: 'Ручное добавление алерта',
    alertTitle: 'Заголовок',
    summaryBg: 'Краткое описание (BG)',
    summaryRu: 'Краткое описание (RU)',
    affectedRateKeysLabel: 'Ключи затронутых ставок (через запятую)',
    add: 'Добавить',
    dismissPrompt: 'Укажите причину отклонения',
    optional: 'необязательно',
    selectRateKey: 'Выберите ставку',
    noAffectedKeys: 'У этого алерта нет затронутых ставок — нечего применять.',
    errorPrefix: 'Ошибка',
    saving: 'Сохранение...',
  },
  en: {
    title: 'Legislation',
    subtitle: 'Monitor changes in tax legislation',
    pendingLabel: 'Pending',
    addManual: 'Add manually',
    empty: 'No alerts yet. Add one manually.',
    loading: 'Loading...',
    source: 'Source',
    affectedKeys: 'Affected rate keys',
    review: 'Review',
    dismiss: 'Dismiss',
    apply: 'Apply change',
    statusPending: 'Pending',
    statusReviewing: 'Reviewing',
    statusApplied: 'Applied',
    statusDismissed: 'Dismissed',
    modalApplyTitle: 'Apply rate change',
    rateKey: 'Rate key',
    newValue: 'New value',
    effectiveFrom: 'Effective from',
    effectiveTo: 'Effective to',
    legalBasis: 'Legal basis',
    dvIssue: 'DV issue',
    notesBg: 'Note (BG)',
    notesRu: 'Note (RU)',
    cancel: 'Cancel',
    confirmApply: 'Confirm and apply',
    retroactiveWarning: '⚠ Retroactive change! It will affect periods that already passed.',
    modalAddTitle: 'Add manual alert',
    alertTitle: 'Title',
    summaryBg: 'Summary (BG)',
    summaryRu: 'Summary (RU)',
    affectedRateKeysLabel: 'Affected rate keys (comma-separated)',
    add: 'Add',
    dismissPrompt: 'Provide a reason for dismissal',
    optional: 'optional',
    selectRateKey: 'Select a rate key',
    noAffectedKeys: 'This alert has no affected rate keys — nothing to apply.',
    errorPrefix: 'Error',
    saving: 'Saving...',
  },
  bg: {
    title: 'Законодателство',
    subtitle: 'Мониторинг на промени в данъчното законодателство',
    pendingLabel: 'В очакване',
    addManual: 'Добавяне ръчно',
    empty: 'Все още няма сигнали. Добавете първия ръчно.',
    loading: 'Зареждане...',
    source: 'Източник',
    affectedKeys: 'Засегнати ставки',
    review: 'Разгледай',
    dismiss: 'Отхвърли',
    apply: 'Приложи промяна',
    statusPending: 'В очакване',
    statusReviewing: 'В преглед',
    statusApplied: 'Приложено',
    statusDismissed: 'Отхвърлено',
    modalApplyTitle: 'Прилагане на промяна в ставка',
    rateKey: 'Ключ на ставка',
    newValue: 'Нова стойност',
    effectiveFrom: 'В сила от',
    effectiveTo: 'В сила до',
    legalBasis: 'Нормативно основание',
    dvIssue: 'Брой ДВ',
    notesBg: 'Бележка (BG)',
    notesRu: 'Бележка (RU)',
    cancel: 'Отказ',
    confirmApply: 'Потвърди и приложи',
    retroactiveWarning: '⚠ Ретроактивна промяна! Засяга вече изминали периоди.',
    modalAddTitle: 'Ръчно добавяне на сигнал',
    alertTitle: 'Заглавие',
    summaryBg: 'Кратко описание (BG)',
    summaryRu: 'Кратко описание (RU)',
    affectedRateKeysLabel: 'Ключове на засегнати ставки (разделени със запетая)',
    add: 'Добави',
    dismissPrompt: 'Посочете причина за отхвърлянето',
    optional: 'по избор',
    selectRateKey: 'Изберете ставка',
    noAffectedKeys: 'Този сигнал няма засегнати ставки — няма какво да се приложи.',
    errorPrefix: 'Грешка',
    saving: 'Запазване...',
  },
  uk: {
    title: 'Законодавство',
    subtitle: 'Моніторинг змін у податковому законодавстві',
    pendingLabel: 'На розгляді',
    addManual: 'Додати вручну',
    empty: 'Поки що немає сповіщень. Додайте перше вручну.',
    loading: 'Завантаження...',
    source: 'Джерело',
    affectedKeys: 'Вражені ставки',
    review: 'Розглянути',
    dismiss: 'Відхилити',
    apply: 'Застосувати зміну',
    statusPending: 'На розгляді',
    statusReviewing: 'В роботі',
    statusApplied: 'Застосовано',
    statusDismissed: 'Відхилено',
    modalApplyTitle: 'Застосування зміни ставки',
    rateKey: 'Ключ ставки',
    newValue: 'Нове значення',
    effectiveFrom: 'Діє з',
    effectiveTo: 'Діє по',
    legalBasis: 'Нормативна підстава',
    dvIssue: 'Номер ДВ',
    notesBg: 'Примітка (BG)',
    notesRu: 'Примітка (RU)',
    cancel: 'Скасувати',
    confirmApply: 'Підтвердити та застосувати',
    retroactiveWarning: '⚠ Ретроактивна зміна! Вплине на вже минулі періоди.',
    modalAddTitle: 'Ручне додавання сповіщення',
    alertTitle: 'Заголовок',
    summaryBg: 'Короткий опис (BG)',
    summaryRu: 'Короткий опис (RU)',
    affectedRateKeysLabel: 'Ключі вражених ставок (через кому)',
    add: 'Додати',
    dismissPrompt: 'Вкажіть причину відхилення',
    optional: 'необовʼязково',
    selectRateKey: 'Оберіть ставку',
    noAffectedKeys: 'У цього сповіщення немає вражених ставок — немає чого застосовувати.',
    errorPrefix: 'Помилка',
    saving: 'Збереження...',
  },
}

function statusColors(status: LegislationStatus): { bg: string; fg: string } {
  switch (status) {
    case 'pending':
      return { bg: '#fef3c7', fg: '#b45309' }
    case 'reviewing':
      return { bg: '#dbeafe', fg: '#1d4ed8' }
    case 'applied':
      return { bg: '#dcfce7', fg: '#15803d' }
    case 'dismissed':
      return { bg: '#e5e7eb', fg: '#4b5563' }
  }
}

export default function LegislationTab() {
  const language = useUserStore(s => s.language) || 'ru'
  const labels = T[language] ?? T.ru

  const {
    alerts,
    isLoaded,
    isLoading,
    loadAlerts,
    addManualAlert,
    updateAlertStatus,
    applyRateChange,
    getPendingCount,
  } = useLegislationStore()

  const [applyTarget, setApplyTarget] = useState<LegislationAlert | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) loadAlerts()
  }, [isLoaded, loadAlerts])

  const pendingCount = getPendingCount()

  return (
    <div className="max-w-4xl space-y-4">
      {/* Header */}
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
          <div className="mt-2 flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ backgroundColor: '#fef3c7', color: '#b45309' }}
            >
              <span className="text-sm leading-none">●</span>
              {labels.pendingLabel}: {pendingCount}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            setError(null)
            setShowAddForm(true)
          }}
          className="rounded-xl px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)', color: 'white' }}
        >
          + {labels.addManual}
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

      {/* Alerts list */}
      {isLoading && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {labels.loading}
        </p>
      )}

      {!isLoading && alerts.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {labels.empty}
        </p>
      )}

      <div className="space-y-2">
        {alerts.map(alert => (
          <AlertCard
            key={alert.id}
            alert={alert}
            labels={labels}
            onReview={async () => {
              const err = await updateAlertStatus(alert.id, 'reviewing')
              if (err) setError(err)
            }}
            onDismiss={async () => {
              const reason = window.prompt(labels.dismissPrompt) ?? ''
              if (reason === null) return
              const err = await updateAlertStatus(alert.id, 'dismissed', reason)
              if (err) setError(err)
            }}
            onApply={() => {
              setError(null)
              if (!alert.affected_rate_keys || alert.affected_rate_keys.length === 0) {
                setError(labels.noAffectedKeys)
                return
              }
              setApplyTarget(alert)
            }}
          />
        ))}
      </div>

      {applyTarget && (
        <ApplyModal
          alert={applyTarget}
          labels={labels}
          onClose={() => setApplyTarget(null)}
          onSubmit={async args => {
            const err = await applyRateChange({ ...args, alertId: applyTarget.id })
            if (err) {
              setError(err)
              return false
            }
            setApplyTarget(null)
            return true
          }}
        />
      )}

      {showAddForm && (
        <AddManualModal
          labels={labels}
          onClose={() => setShowAddForm(false)}
          onSubmit={async (title, bg, ru, keys) => {
            const err = await addManualAlert(title, bg, ru, keys)
            if (err) {
              setError(err)
              return false
            }
            setShowAddForm(false)
            return true
          }}
        />
      )}
    </div>
  )
}

function AlertCard({
  alert,
  labels,
  onReview,
  onDismiss,
  onApply,
}: {
  alert: LegislationAlert
  labels: (typeof T)['ru']
  onReview: () => void
  onDismiss: () => void
  onApply: () => void
}) {
  const sc = statusColors(alert.status)
  const statusLabel =
    alert.status === 'pending'
      ? labels.statusPending
      : alert.status === 'reviewing'
        ? labels.statusReviewing
        : alert.status === 'applied'
          ? labels.statusApplied
          : labels.statusDismissed

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
            <span
              className="text-xs font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              {alert.source}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {new Date(alert.created_at).toLocaleString()}
            </span>
          </div>

          <p
            className="text-sm font-medium mt-1.5"
            style={{ color: 'var(--text-primary)' }}
          >
            {alert.title}
          </p>

          {alert.summary_ru && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {alert.summary_ru}
            </p>
          )}

          {alert.source_url && (
            <a
              href={alert.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline mt-1 inline-block"
              style={{ color: 'var(--accent)' }}
            >
              {alert.source_url}
            </a>
          )}

          {alert.affected_rate_keys && alert.affected_rate_keys.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {labels.affectedKeys}:
              </span>
              {alert.affected_rate_keys.map(k => (
                <span
                  key={k}
                  className="rounded-md px-1.5 py-0.5 text-xs font-mono"
                  style={{
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {k}
                </span>
              ))}
            </div>
          )}

          {alert.review_notes && (
            <p
              className="text-xs italic mt-2"
              style={{ color: 'var(--text-muted)' }}
            >
              {alert.review_notes}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {alert.status === 'pending' && (
            <>
              <button
                onClick={onReview}
                className="rounded-lg px-3 py-1.5 text-xs font-medium"
                style={{
                  backgroundColor: 'var(--accent-light)',
                  color: 'var(--accent)',
                }}
              >
                {labels.review}
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
            </>
          )}

          {alert.status === 'reviewing' && (
            <>
              <button
                onClick={onApply}
                className="rounded-lg px-3 py-1.5 text-xs font-medium"
                style={{ backgroundColor: '#15803d', color: 'white' }}
              >
                {labels.apply}
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}

interface ApplySubmitArgs {
  rateKey: string
  newValue: number
  effectiveFrom: string
  effectiveTo: string | null
  legalBasis: string
  dvIssue: string | null
  notesBg: string | null
  notesRu: string | null
}

function ApplyModal({
  alert,
  labels,
  onClose,
  onSubmit,
}: {
  alert: LegislationAlert
  labels: (typeof T)['ru']
  onClose: () => void
  onSubmit: (args: ApplySubmitArgs) => Promise<boolean>
}) {
  const keys = alert.affected_rate_keys ?? []
  const [rateKey, setRateKey] = useState<string>(keys[0] ?? '')
  const [newValue, setNewValue] = useState<string>('')
  const [effectiveFrom, setEffectiveFrom] = useState<string>(
    new Date().toISOString().slice(0, 10),
  )
  const [effectiveTo, setEffectiveTo] = useState<string>('')
  const [legalBasis, setLegalBasis] = useState<string>('')
  const [dvIssue, setDvIssue] = useState<string>('')
  const [notesBg, setNotesBg] = useState<string>('')
  const [notesRu, setNotesRu] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const isRetroactive = effectiveFrom && effectiveFrom < today

  const canSubmit = rateKey && newValue && effectiveFrom && legalBasis && !saving

  return (
    <ModalShell onClose={onClose} title={labels.modalApplyTitle}>
      <div className="space-y-3">
        <Field label={labels.rateKey}>
          <select
            value={rateKey}
            onChange={e => setRateKey(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)' }}
          >
            <option value="">{labels.selectRateKey}</option>
            {keys.map(k => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </Field>

        <Field label={labels.newValue}>
          <input
            type="number"
            step="0.000001"
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)' }}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={labels.effectiveFrom}>
            <input
              type="date"
              value={effectiveFrom}
              onChange={e => setEffectiveFrom(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--border)' }}
            />
          </Field>
          <Field label={`${labels.effectiveTo} (${labels.optional})`}>
            <input
              type="date"
              value={effectiveTo}
              onChange={e => setEffectiveTo(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--border)' }}
            />
          </Field>
        </div>

        {isRetroactive && (
          <div
            className="rounded-xl px-3 py-2 text-xs"
            style={{ backgroundColor: '#fef3c7', color: '#b45309' }}
          >
            {labels.retroactiveWarning}
          </div>
        )}

        <Field label={labels.legalBasis}>
          <input
            type="text"
            value={legalBasis}
            onChange={e => setLegalBasis(e.target.value)}
            placeholder="ЗДДС чл. 66"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)' }}
          />
        </Field>

        <Field label={`${labels.dvIssue} (${labels.optional})`}>
          <input
            type="text"
            value={dvIssue}
            onChange={e => setDvIssue(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)' }}
          />
        </Field>

        <Field label={labels.notesBg}>
          <input
            type="text"
            value={notesBg}
            onChange={e => setNotesBg(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)' }}
          />
        </Field>

        <Field label={labels.notesRu}>
          <input
            type="text"
            value={notesRu}
            onChange={e => setNotesRu(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)' }}
          />
        </Field>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            {labels.cancel}
          </button>
          <button
            disabled={!canSubmit}
            onClick={async () => {
              setSaving(true)
              const ok = await onSubmit({
                rateKey,
                newValue: Number(newValue),
                effectiveFrom,
                effectiveTo: effectiveTo || null,
                legalBasis,
                dvIssue: dvIssue || null,
                notesBg: notesBg || null,
                notesRu: notesRu || null,
              })
              if (!ok) setSaving(false)
            }}
            className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: '#15803d', color: 'white' }}
          >
            {saving ? labels.saving : labels.confirmApply}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

function AddManualModal({
  labels,
  onClose,
  onSubmit,
}: {
  labels: (typeof T)['ru']
  onClose: () => void
  onSubmit: (
    title: string,
    summaryBg: string,
    summaryRu: string,
    affectedKeys: string[],
  ) => Promise<boolean>
}) {
  const [title, setTitle] = useState('')
  const [summaryBg, setSummaryBg] = useState('')
  const [summaryRu, setSummaryRu] = useState('')
  const [keysText, setKeysText] = useState('')
  const [saving, setSaving] = useState(false)

  const canSubmit = title.trim().length > 0 && !saving

  return (
    <ModalShell onClose={onClose} title={labels.modalAddTitle}>
      <div className="space-y-3">
        <Field label={labels.alertTitle}>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)' }}
          />
        </Field>

        <Field label={labels.summaryBg}>
          <textarea
            value={summaryBg}
            onChange={e => setSummaryBg(e.target.value)}
            rows={2}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)' }}
          />
        </Field>

        <Field label={labels.summaryRu}>
          <textarea
            value={summaryRu}
            onChange={e => setSummaryRu(e.target.value)}
            rows={2}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)' }}
          />
        </Field>

        <Field label={labels.affectedRateKeysLabel}>
          <input
            type="text"
            value={keysText}
            onChange={e => setKeysText(e.target.value)}
            placeholder="corporateTax, vat, employer.doo"
            className="w-full rounded-lg border px-3 py-2 text-sm font-mono"
            style={{ borderColor: 'var(--border)' }}
          />
        </Field>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            {labels.cancel}
          </button>
          <button
            disabled={!canSubmit}
            onClick={async () => {
              setSaving(true)
              const keys = keysText
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
              const ok = await onSubmit(title.trim(), summaryBg, summaryRu, keys)
              if (!ok) setSaving(false)
            }}
            className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
          >
            {saving ? labels.saving : labels.add}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl p-5 max-h-[90vh] overflow-auto"
        style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3
          className="text-base font-semibold mb-4"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h3>
        {children}
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        className="block text-xs mb-1"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}
