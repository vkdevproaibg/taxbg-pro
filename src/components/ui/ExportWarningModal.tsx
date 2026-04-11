import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useUserStore } from '../../store/userStore'
import {
  EXPORT_WARNING_TEXTS,
  EXPORT_WARNING_TITLES,
  type RetentionClass,
} from '../../lib/exportAcknowledgement'

export interface ExportWarningModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  documentName: string
  retentionClass: RetentionClass
  retainUntil: string
  legalBasis: string
}

const RETENTION_LABELS: Record<RetentionClass, Record<string, string>> = {
  payroll_50y: {
    ru: 'Зарплатные документы · 50 лет',
    en: 'Payroll · 50 years',
    bg: 'Ведомости за заплати · 50 години',
    uk: 'Зарплатні документи · 50 років',
  },
  accounting_10y: {
    ru: 'Бухгалтерские документы · 10 лет',
    en: 'Accounting · 10 years',
    bg: 'Счетоводни документи · 10 години',
    uk: 'Бухгалтерські документи · 10 років',
  },
  tax_control_extended: {
    ru: 'Налоговый контроль · расширенный срок',
    en: 'Tax control · extended period',
    bg: 'Данъчен контрол · удължен срок',
    uk: 'Податковий контроль · розширений строк',
  },
  general_3y: {
    ru: 'Общие документы · 3 года',
    en: 'General · 3 years',
    bg: 'Общи документи · 3 години',
    uk: 'Загальні документи · 3 роки',
  },
  legal_hold: {
    ru: 'Судебная блокировка',
    en: 'Legal hold',
    bg: 'Съдебна блокировка',
    uk: 'Судова блокировка',
  },
  manual_delete: {
    ru: 'Ручное удаление',
    en: 'Manual delete',
    bg: 'Ръчно изтриване',
    uk: 'Ручне видалення',
  },
}

const LABELS = {
  ru: {
    ackCheckbox: 'Я понимаю и принимаю ответственность за хранение',
    document: 'Документ',
    retention: 'Класс хранения',
    retainUntil: 'Срок хранения до',
    legalBasis: 'Правовая основа',
    cancel: 'Отмена',
    download: 'Скачать',
    close: 'Закрыть',
  },
  en: {
    ackCheckbox: 'I understand and accept retention responsibility',
    document: 'Document',
    retention: 'Retention class',
    retainUntil: 'Retain until',
    legalBasis: 'Legal basis',
    cancel: 'Cancel',
    download: 'Download',
    close: 'Close',
  },
  bg: {
    ackCheckbox: 'Разбирам и приемам отговорността за съхранение',
    document: 'Документ',
    retention: 'Клас на съхранение',
    retainUntil: 'Срок на съхранение до',
    legalBasis: 'Правно основание',
    cancel: 'Отказ',
    download: 'Изтегли',
    close: 'Затвори',
  },
  uk: {
    ackCheckbox: 'Я розумію та приймаю відповідальність за зберігання',
    document: 'Документ',
    retention: 'Клас зберігання',
    retainUntil: 'Строк зберігання до',
    legalBasis: 'Правова основа',
    cancel: 'Скасувати',
    download: 'Завантажити',
    close: 'Закрити',
  },
}

export default function ExportWarningModal({
  isOpen,
  onClose,
  onConfirm,
  documentName,
  retentionClass,
  retainUntil,
  legalBasis,
}: ExportWarningModalProps) {
  const language = useUserStore((s) => s.language)
  const [acknowledged, setAcknowledged] = useState(false)

  const labels = LABELS[language] ?? LABELS.ru
  const title = EXPORT_WARNING_TITLES[language] ?? EXPORT_WARNING_TITLES.ru
  const text = EXPORT_WARNING_TEXTS[language] ?? EXPORT_WARNING_TEXTS.ru
  const retentionLabel = RETENTION_LABELS[retentionClass]?.[language] ?? retentionClass

  useEffect(() => {
    if (!isOpen) setAcknowledged(false)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleConfirm = () => {
    if (!acknowledged) return
    onConfirm()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl"
        style={{
          backgroundColor: 'var(--surface-card)',
          border: '1.5px solid var(--danger)',
        }}
      >
        <div
          className="flex items-start justify-between gap-3 px-6 py-4"
          style={{ backgroundColor: 'var(--danger-light)' }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="h-6 w-6 shrink-0"
              style={{ color: 'var(--danger)' }}
            />
            <h2
              className="text-base font-semibold leading-tight"
              style={{ color: 'var(--danger-text)' }}
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 transition-colors hover:bg-white/40"
            aria-label={labels.close}
          >
            <X className="h-4 w-4" style={{ color: 'var(--danger-text)' }} />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-5">
          <p
            className="whitespace-pre-wrap text-xs leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {text}
          </p>

          <div
            className="rounded-xl p-3 space-y-1.5 text-xs"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-start gap-2">
              <span className="w-28 shrink-0 font-medium" style={{ color: 'var(--text-muted)' }}>
                {labels.document}:
              </span>
              <span className="flex-1 break-words" style={{ color: 'var(--text-primary)' }}>
                {documentName}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-28 shrink-0 font-medium" style={{ color: 'var(--text-muted)' }}>
                {labels.retention}:
              </span>
              <span className="flex-1" style={{ color: 'var(--text-primary)' }}>
                {retentionLabel}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-28 shrink-0 font-medium" style={{ color: 'var(--text-muted)' }}>
                {labels.retainUntil}:
              </span>
              <span className="flex-1 font-semibold" style={{ color: 'var(--danger-text)' }}>
                {retainUntil}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-28 shrink-0 font-medium" style={{ color: 'var(--text-muted)' }}>
                {labels.legalBasis}:
              </span>
              <span className="flex-1" style={{ color: 'var(--text-primary)' }}>
                {legalBasis}
              </span>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded"
              style={{ accentColor: 'var(--danger)' }}
            />
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {labels.ackCheckbox}
            </span>
          </label>
        </div>

        <div
          className="flex items-center justify-end gap-2 border-t px-6 py-4"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--surface)',
              color: 'var(--text-secondary)',
              border: '1.5px solid var(--border)',
            }}
          >
            {labels.cancel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!acknowledged}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: 'var(--danger)' }}
          >
            {labels.download}
          </button>
        </div>
      </div>
    </div>
  )
}
