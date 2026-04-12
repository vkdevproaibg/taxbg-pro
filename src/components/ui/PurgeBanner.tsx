import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUserStore } from '../../store/userStore'
import { usePurgeStore } from '../../store/purgeStore'
import type { AppLanguage } from '../../store/userStore'

const UI: Record<AppLanguage, {
  message: (date: string) => string
  cancel: string
  downloadArchive: string
  cancelling: string
  cancelError: string
}> = {
  ru: {
    message: (d) => `Аккаунт будет удалён ${d}.`,
    cancel: 'Отменить',
    downloadArchive: 'Скачать архив',
    cancelling: 'Отмена...',
    cancelError: 'Не удалось отменить. Попробуйте ещё раз.',
  },
  uk: {
    message: (d) => `Акаунт буде видалено ${d}.`,
    cancel: 'Скасувати',
    downloadArchive: 'Завантажити архів',
    cancelling: 'Скасування...',
    cancelError: 'Не вдалося скасувати. Спробуйте ще раз.',
  },
  en: {
    message: (d) => `Account will be deleted on ${d}.`,
    cancel: 'Cancel',
    downloadArchive: 'Download archive',
    cancelling: 'Cancelling...',
    cancelError: 'Failed to cancel. Please try again.',
  },
  bg: {
    message: (d) => `Акаунтът ще бъде изтрит на ${d}.`,
    cancel: 'Отмени',
    downloadArchive: 'Свали архив',
    cancelling: 'Отменя се...',
    cancelError: 'Неуспешна отмяна. Опитайте отново.',
  },
}

function formatDate(iso: string, language: AppLanguage): string {
  const locale = language === 'bg' ? 'bg-BG' : language === 'uk' ? 'uk-UA' : language === 'en' ? 'en-GB' : 'ru-RU'
  try {
    return new Date(iso).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso.slice(0, 10)
  }
}

export default function PurgeBanner() {
  const language = useUserStore((s) => s.language)
  const purgeScheduledAt = usePurgeStore((s) => s.purgeScheduledAt)
  const cancelPurge = usePurgeStore((s) => s.cancelPurge)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!purgeScheduledAt) return null

  const ui = UI[language] ?? UI.ru
  const dateLabel = formatDate(purgeScheduledAt, language)

  const handleCancel = async () => {
    setCancelling(true)
    setError(null)
    const err = await cancelPurge()
    setCancelling(false)
    if (err) setError(ui.cancelError)
  }

  return (
    <div className="border-b border-red-300 bg-red-50 px-4 py-2 text-sm text-red-900">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <span className="font-medium">⚠ {ui.message(dateLabel)}</span>
        <div className="flex items-center gap-3">
          <Link to="/vault" className="underline hover:text-red-700">
            {ui.downloadArchive}
          </Link>
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="rounded-md border border-red-400 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
          >
            {cancelling ? ui.cancelling : ui.cancel}
          </button>
          {error && <span className="text-xs text-red-700">{error}</span>}
        </div>
      </div>
    </div>
  )
}
