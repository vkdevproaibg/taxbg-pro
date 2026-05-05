import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useUserStore } from '../store/userStore'

const UI = {
  ru: {
    title: 'Сброс пароля',
    subtitle: 'Введите email — вышлем ссылку для сброса',
    email: 'Email',
    send: 'Отправить ссылку для сброса',
    sending: 'Отправляем…',
    backToLogin: '← Вернуться к входу',
    successMsg: (email: string) =>
      `Ссылка отправлена на ${email}. Проверьте почту (и папку «Спам»).`,
    errGeneric: 'Не удалось отправить письмо. Проверьте email и попробуйте снова.',
    errNetwork: 'Проверьте подключение к интернету.',
  },
  uk: {
    title: 'Скидання пароля',
    subtitle: 'Введіть email — надішлемо посилання для скидання',
    email: 'Email',
    send: 'Надіслати посилання для скидання',
    sending: 'Надсилаємо…',
    backToLogin: '← Повернутись до входу',
    successMsg: (email: string) =>
      `Посилання надіслано на ${email}. Перевірте пошту (та папку «Спам»).`,
    errGeneric: 'Не вдалося надіслати листа. Перевірте email і спробуйте знову.',
    errNetwork: 'Перевірте підключення до інтернету.',
  },
  en: {
    title: 'Reset password',
    subtitle: 'Enter your email — we will send a reset link',
    email: 'Email',
    send: 'Send reset link',
    sending: 'Sending…',
    backToLogin: '← Back to sign in',
    successMsg: (email: string) =>
      `A reset link was sent to ${email}. Check your inbox (and spam folder).`,
    errGeneric: 'Could not send the email. Check your email address and try again.',
    errNetwork: 'Check your internet connection.',
  },
  bg: {
    title: 'Нулиране на парола',
    subtitle: 'Въведи email — ще изпратим линк за нулиране',
    email: 'Email',
    send: 'Изпрати линк за нулиране',
    sending: 'Изпращаме…',
    backToLogin: '← Обратно към вход',
    successMsg: (email: string) =>
      `Линкът е изпратен на ${email}. Провери пощата си (и папка „Спам").`,
    errGeneric: 'Не можа да се изпрати писмото. Провери email-а и опитай отново.',
    errNetwork: 'Провери интернет връзката.',
  },
} as const

const inputStyle: React.CSSProperties = {
  border: '1.5px solid var(--border)',
  backgroundColor: 'var(--surface)',
  color: 'var(--text-primary)',
  borderRadius: 12,
  padding: '10px 16px',
  fontSize: 14,
  width: '100%',
  outline: 'none',
}

export default function ResetPassword() {
  const language = useUserStore((s) => s.language)
  const resetPassword = useAuthStore((s) => s.resetPassword)
  const t = UI[language]

  const [email,      setEmail]      = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [sent,       setSent]       = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const errMsg = await resetPassword(email)
    setSubmitting(false)
    if (errMsg) {
      const low = errMsg.toLowerCase()
      setError(
        low.includes('network') || low.includes('fetch') ? t.errNetwork : t.errGeneric,
      )
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--surface)' }}>
      <div className="fixed top-0 left-0 right-0 h-3 bg-flag-stripe" />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4"
            style={{ backgroundColor: 'var(--accent)' }}>
            <span className="text-3xl">🌹</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>TaxBG Pro</h1>
          <div className="mt-4 mx-auto w-24 h-2 rounded-full bg-flag-stripe" />
        </div>

        <div className="rounded-2xl shadow-lg overflow-hidden"
          style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
          <div className="px-6 pt-5 pb-2">
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t.title}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {t.subtitle}
            </p>
          </div>

          <div className="p-6 space-y-4">
            {sent ? (
              <div className="rounded-xl px-3 py-3 text-sm"
                style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-text)' }}>
                {t.successMsg(email)}
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {t.email}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>

                {error && (
                  <div className="rounded-xl px-3 py-2 text-sm"
                    style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger-text)' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !email}
                  className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-colors disabled:opacity-40"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  {submitting ? t.sending : t.send}
                </button>
              </form>
            )}

            <Link to="/login" className="block text-center text-xs underline"
              style={{ color: 'var(--text-muted)' }}>
              {t.backToLogin}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
