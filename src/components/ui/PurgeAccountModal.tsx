import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useUserStore } from '../../store/userStore'
import { usePurgeStore } from '../../store/purgeStore'
import type { AppLanguage } from '../../store/userStore'

interface Props {
  open: boolean
  onClose: () => void
}

const UI: Record<AppLanguage, {
  title: string
  step1Title: string
  willBeDeleted: string
  deletedItems: string[]
  willBeKept: string
  keptItems: string[]
  ackArchive: string
  downloadArchive: string
  step2Title: string
  emailLabel: string
  emailPlaceholder: string
  emailMismatch: string
  confirmLabel: string
  confirmKeyword: string
  confirmPlaceholder: string
  step3Title: string
  step3Text1: string
  step3Text2: string
  next: string
  back: string
  submit: string
  close: string
  cancel: string
  submitting: string
  errorGeneric: string
}> = {
  ru: {
    title: 'Удаление аккаунта',
    step1Title: 'Шаг 1 · Что будет удалено',
    willBeDeleted: 'Будет удалено:',
    deletedItems: [
      'Ваш профиль и настройки',
      'Все компании, добавленные в систему',
      'Все транзакции, проводки, документы',
      'AI-история, настройки интеграций',
      'Все уведомления и закладки',
    ],
    willBeKept: 'НЕ может быть удалено сразу (по закону):',
    keptItems: [
      'Зарплатные ведомости и документы стажа — до истечения 50-летнего срока хранения, хранятся в анонимизированном виде',
      'Записи в audit log — до истечения срока хранения',
    ],
    ackArchive: 'Я скачал архив документов из /vault',
    downloadArchive: 'Скачать архив →',
    step2Title: 'Шаг 2 · Подтверждение',
    emailLabel: 'Введите email, привязанный к аккаунту',
    emailPlaceholder: 'you@example.com',
    emailMismatch: 'Email не совпадает с аккаунтом',
    confirmLabel: 'Введите слово',
    confirmKeyword: 'УДАЛИТЬ',
    confirmPlaceholder: 'УДАЛИТЬ',
    step3Title: 'Заявка принята',
    step3Text1: 'Вы получите уведомления за 90, 30 и 7 дней до окончательного удаления.',
    step3Text2: 'Отменить заявку можно в любое время в разделе «Настройки».',
    next: 'Далее',
    back: 'Назад',
    submit: 'Подать заявку на удаление',
    close: 'Закрыть',
    cancel: 'Отмена',
    submitting: 'Отправка...',
    errorGeneric: 'Не удалось отправить заявку. Попробуйте ещё раз.',
  },
  uk: {
    title: 'Видалення акаунта',
    step1Title: 'Крок 1 · Що буде видалено',
    willBeDeleted: 'Буде видалено:',
    deletedItems: [
      'Ваш профіль і налаштування',
      'Усі компанії, додані в систему',
      'Усі транзакції, проводки, документи',
      'AI-історія, налаштування інтеграцій',
      'Усі сповіщення та закладки',
    ],
    willBeKept: 'НЕ може бути видалено одразу (за законом):',
    keptItems: [
      'Відомості про зарплату та стаж — до завершення 50-річного терміну зберігання, у знеособленому вигляді',
      'Записи audit log — до завершення терміну зберігання',
    ],
    ackArchive: 'Я завантажив архів документів з /vault',
    downloadArchive: 'Завантажити архів →',
    step2Title: 'Крок 2 · Підтвердження',
    emailLabel: 'Введіть email, прив\'язаний до акаунта',
    emailPlaceholder: 'you@example.com',
    emailMismatch: 'Email не збігається з акаунтом',
    confirmLabel: 'Введіть слово',
    confirmKeyword: 'ВИДАЛИТИ',
    confirmPlaceholder: 'ВИДАЛИТИ',
    step3Title: 'Заявку прийнято',
    step3Text1: 'Ви отримаєте сповіщення за 90, 30 та 7 днів до остаточного видалення.',
    step3Text2: 'Скасувати заявку можна у будь-який час у «Налаштуваннях».',
    next: 'Далі',
    back: 'Назад',
    submit: 'Подати заявку на видалення',
    close: 'Закрити',
    cancel: 'Скасувати',
    submitting: 'Надсилання...',
    errorGeneric: 'Не вдалося надіслати заявку. Спробуйте ще раз.',
  },
  en: {
    title: 'Delete account',
    step1Title: 'Step 1 · What will be deleted',
    willBeDeleted: 'Will be deleted:',
    deletedItems: [
      'Your profile and settings',
      'All companies added to the system',
      'All transactions, journal entries, documents',
      'AI history and integration settings',
      'All notifications and bookmarks',
    ],
    willBeKept: 'Cannot be deleted immediately (legal requirement):',
    keptItems: [
      'Payroll and length-of-service records — retained for the 50-year statutory period in anonymised form',
      'Audit log entries — retained for the statutory period',
    ],
    ackArchive: 'I have downloaded the archive from /vault',
    downloadArchive: 'Download archive →',
    step2Title: 'Step 2 · Confirmation',
    emailLabel: 'Enter the email linked to your account',
    emailPlaceholder: 'you@example.com',
    emailMismatch: 'Email does not match the account',
    confirmLabel: 'Type the word',
    confirmKeyword: 'DELETE',
    confirmPlaceholder: 'DELETE',
    step3Title: 'Request accepted',
    step3Text1: 'You will receive notifications 90, 30 and 7 days before the final deletion.',
    step3Text2: 'You can cancel the request at any time from Settings.',
    next: 'Next',
    back: 'Back',
    submit: 'Submit deletion request',
    close: 'Close',
    cancel: 'Cancel',
    submitting: 'Submitting...',
    errorGeneric: 'Failed to submit the request. Please try again.',
  },
  bg: {
    title: 'Изтриване на акаунт',
    step1Title: 'Стъпка 1 · Какво ще бъде изтрито',
    willBeDeleted: 'Ще бъде изтрито:',
    deletedItems: [
      'Вашият профил и настройки',
      'Всички дружества, добавени в системата',
      'Всички транзакции, счетоводни операции и документи',
      'История на AI и интеграционни настройки',
      'Всички известия и отметки',
    ],
    willBeKept: 'НЕ може да бъде изтрито веднага (законово изискване):',
    keptItems: [
      'Ведомости за заплати и документи за осигурителен стаж — до изтичане на 50-годишния срок, в анонимизиран вид',
      'Записи в audit log — до изтичане на законния срок',
    ],
    ackArchive: 'Свалих архива на документите си от /vault',
    downloadArchive: 'Свали архив →',
    step2Title: 'Стъпка 2 · Потвърждение',
    emailLabel: 'Въведете email, свързан с акаунта',
    emailPlaceholder: 'you@example.com',
    emailMismatch: 'Email не съвпада с акаунта',
    confirmLabel: 'Въведете думата',
    confirmKeyword: 'ИЗТРИЙ',
    confirmPlaceholder: 'ИЗТРИЙ',
    step3Title: 'Заявката е приета',
    step3Text1: 'Ще получите известия на 90, 30 и 7 дни преди окончателното изтриване.',
    step3Text2: 'Можете да отмените заявката по всяко време от "Настройки".',
    next: 'Напред',
    back: 'Назад',
    submit: 'Подай заявка за изтриване',
    close: 'Затвори',
    cancel: 'Отказ',
    submitting: 'Изпраща се...',
    errorGeneric: 'Неуспешно подаване на заявката. Опитайте отново.',
  },
}

export default function PurgeAccountModal({ open, onClose }: Props) {
  const language = useUserStore((s) => s.language)
  const ui = UI[language] ?? UI.ru
  const userEmail = useAuthStore((s) => s.user?.email ?? '')
  const requestPurge = usePurgeStore((s) => s.requestPurge)

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [ack, setAck] = useState(false)
  const [email, setEmail] = useState('')
  const [confirmWord, setConfirmWord] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const close = () => {
    setStep(1)
    setAck(false)
    setEmail('')
    setConfirmWord('')
    setError(null)
    onClose()
  }

  const emailOk = !!userEmail && email.trim().toLowerCase() === userEmail.toLowerCase()
  const wordOk = confirmWord.trim() === ui.confirmKeyword
  const canSubmit = emailOk && wordOk && !submitting

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    const err = await requestPurge()
    setSubmitting(false)
    if (err) {
      setError(ui.errorGeneric)
      return
    }
    setStep(3)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-bold text-slate-800">{ui.title}</h2>
          <button
            type="button"
            onClick={close}
            className="text-slate-400 hover:text-slate-600"
            aria-label={ui.close}
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  step >= n ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                {n}
              </span>
              {n < 3 && <div className={`h-px flex-1 ${step > n ? 'bg-red-600' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="mt-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-800">{ui.step1Title}</h3>

            <div>
              <p className="text-sm font-medium text-slate-700">{ui.willBeDeleted}</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {ui.deletedItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-800">{ui.willBeKept}</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-800">
                {ui.keptItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <Link
              to="/vault"
              onClick={close}
              className="inline-block text-sm text-blue-600 underline hover:text-blue-700"
            >
              {ui.downloadArchive}
            </Link>

            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>{ui.ackArchive}</span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={close}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                {ui.cancel}
              </button>
              <button
                type="button"
                disabled={!ack}
                onClick={() => setStep(2)}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {ui.next}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-800">{ui.step2Title}</h3>

            <label className="block">
              <span className="block text-sm text-slate-700">{ui.emailLabel}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={ui.emailPlaceholder}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
              />
              {email && !emailOk && (
                <span className="mt-1 block text-xs text-red-600">{ui.emailMismatch}</span>
              )}
            </label>

            <label className="block">
              <span className="block text-sm text-slate-700">
                {ui.confirmLabel} <span className="font-semibold">{ui.confirmKeyword}</span>
              </span>
              <input
                type="text"
                value={confirmWord}
                onChange={(e) => setConfirmWord(e.target.value)}
                placeholder={ui.confirmPlaceholder}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
              />
            </label>

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                {ui.back}
              </button>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={handleSubmit}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {submitting ? ui.submitting : ui.submit}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-800">✓ {ui.step3Title}</h3>
            <p className="text-sm text-slate-700">{ui.step3Text1}</p>
            <p className="text-sm text-slate-600">{ui.step3Text2}</p>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={close}
                className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
              >
                {ui.close}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
