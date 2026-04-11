import { useState } from 'react'
import { CHART_OF_ACCOUNTS } from '../../constants/chartOfAccounts'
import type { JournalEntry } from '../../store/journalStore'

interface Props {
  entry: JournalEntry
  isClosed: boolean
  onSave: (patch: {
    debitAccount?: string
    creditAccount?: string
    amount?: number
    description?: string
    editReason?: string
  }) => void
  onStorno: () => void
  onClose: () => void
}

const DISCLAIMER =
  'Вы изменяете автоматически созданную запись. ' +
  'TaxBG Pro фиксирует это изменение в истории. ' +
  'Система является информационным помощником и не несёт ' +
  'ответственности за корректность ручных правок. ' +
  'Убедитесь что изменение соответствует НСС.'

export default function EditJournalEntryModal({
  entry, isClosed, onSave, onStorno, onClose,
}: Props) {
  const [debit,       setDebit]       = useState(entry.debitAccount)
  const [credit,      setCredit]      = useState(entry.creditAccount)
  const [amount,      setAmount]      = useState(entry.amount.toString())
  const [description, setDescription] = useState(entry.description)
  const [reason,      setReason]      = useState('')

  const accounts = CHART_OF_ACCOUNTS.map((a) => ({
    value: a.code,
    label: `${a.code} — ${a.name_ru}`,
  }))

  const hasChanges =
    debit !== entry.debitAccount ||
    credit !== entry.creditAccount ||
    parseFloat(amount) !== entry.amount ||
    description !== entry.description

  const overlayStyle: React.CSSProperties = {
    backgroundColor: 'rgba(0,0,0,0.5)',
  }

  if (isClosed) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={overlayStyle}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="w-full max-w-md rounded-2xl overflow-hidden"
          style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}
        >
          <div className="px-6 py-5 space-y-4">
            <p className="text-lg">🔒</p>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Период закрыт
            </p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Прямая правка проводок закрытого периода невозможна по НСС 8
              (Национален счетоводен стандарт 8 — Счетоводни грешки).
            </p>
            <div
              className="rounded-xl p-3"
              style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)' }}
            >
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--accent-text)' }}>
                💡 Как исправить ошибку?
              </p>
              <p className="text-xs" style={{ color: 'var(--accent-text)' }}>
                Создайте сторно-проводку в текущем периоде. Система автоматически создаст
                корректирующую запись с пометкой «Корекция по НСС 8».
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl py-2 text-sm"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                Отмена
              </button>
              <button
                onClick={onStorno}
                className="flex-1 rounded-xl py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                Создать сторно
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={overlayStyle}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border)' }}
        >
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            ✏️ Редактировать проводку
          </p>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* History of edits */}
          {entry.isManuallyEdited && (
            <div
              className="rounded-xl p-3 text-xs"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p className="font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                🖊️ История правок
              </p>
              <p style={{ color: 'var(--text-muted)' }}>
                Исходная: Дт {entry.originalDebit} / Кт {entry.originalCredit} —{' '}
                {entry.originalAmount?.toFixed(2)} €
              </p>
              {entry.editedAt && (
                <p style={{ color: 'var(--text-muted)' }}>
                  Изменено: {new Date(entry.editedAt).toLocaleString()}
                </p>
              )}
              {entry.editReason && (
                <p style={{ color: 'var(--text-muted)' }}>Причина: {entry.editReason}</p>
              )}
            </div>
          )}

          {/* Debit account */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Дебит (сч.)
            </label>
            <select
              value={debit}
              onChange={(e) => setDebit(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{
                border: '1.5px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
              }}
            >
              {accounts.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* Credit account */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Кредит (сч.)
            </label>
            <select
              value={credit}
              onChange={(e) => setCredit(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{
                border: '1.5px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
              }}
            >
              {accounts.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Сумма (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{
                border: '1.5px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Описание
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{
                border: '1.5px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Edit reason */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Причина правки (опционально)
            </label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Например: неверный счёт при автозаполнении"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{
                border: '1.5px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Disclaimer */}
          <div
            className="rounded-xl p-3"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              ⚠️ {DISCLAIMER}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl py-2 text-sm"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              Отмена
            </button>
            <button
              onClick={() =>
                onSave({
                  debitAccount:  debit,
                  creditAccount: credit,
                  amount:        parseFloat(amount),
                  description,
                  editReason:    reason || undefined,
                })
              }
              disabled={!hasChanges}
              className="flex-1 rounded-xl py-2 text-sm font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
