import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useUserStore } from '../store/userStore'
import PasswordStrength from '../components/ui/PasswordStrength'

const UI = {
  ru: {
    title: 'Новый пароль',
    subtitle: 'Придумайте надёжный пароль',
    newPassword: 'Новый пароль',
    confirmPassword: 'Подтвердите пароль',
    save: 'Сохранить новый пароль',
    saving: 'Сохраняем…',
    successMsg: 'Пароль изменён. Выполняется вход…',
    errShort: 'Пароль должен быть не менее 8 символов',
    errMismatch: 'Пароли не совпадают',
    errGeneric: 'Не удалось сохранить пароль. Возможно, ссылка устарела.',
    errExpired: 'Ссылка для сброса пароля истекла.',
    getNewLink: 'Запросить новую ссылку',
  },
  uk: {
    title: 'Новий пароль',
    subtitle: 'Придумайте надійний пароль',
    newPassword: 'Новий пароль',
    confirmPassword: 'Підтвердіть пароль',
    save: 'Зберегти новий пароль',
    saving: 'Зберігаємо…',
    successMsg: 'Пароль змінено. Виконується вхід…',
    errShort: 'Пароль має бути не менше 8 символів',
    errMismatch: 'Паролі не збігаються',
    errGeneric: 'Не вдалося зберегти пароль. Можливо, посилання застаріло.',
    errExpired: 'Посилання для скидання пароля застаріло.',
    getNewLink: 'Запросити нове посилання',
  },
  en: {
    title: 'New password',
    subtitle: 'Choose a strong password',
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    save: 'Save new password',
    saving: 'Saving…',
    successMsg: 'Password changed. Signing in…',
    errShort: 'Password must be at least 8 characters',
    errMismatch: 'Passwords do not match',
    errGeneric: 'Could not save password. The link may have expired.',
    errExpired: 'The password reset link has expired.',
    getNewLink: 'Request a new link',
  },
  bg: {
    title: 'Нова парола',
    subtitle: 'Изберете надеждна парола',
    newPassword: 'Нова парола',
    confirmPassword: 'Потвърдете паролата',
    save: 'Запази нова парола',
    saving: 'Запазваме…',
    successMsg: 'Паролата е сменена. Влизаме…',
    errShort: 'Паролата трябва да е поне 8 символа',
    errMismatch: 'Паролите не съвпадат',
    errGeneric: 'Паролата не можа да се запази. Линкът може да е изтекъл.',
    errExpired: 'Линкът за нулиране на паролата е изтекъл.',
    getNewLink: 'Поискай нов линк',
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

export default function UpdatePassword() {
  const language = useUserStore((s) => s.language)
  const updatePassword = useAuthStore((s) => s.updatePassword)
  const navigate = useNavigate()
  const t = UI[language]

  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword,    setShowPassword]    = useState(false)
  const [submitting,      setSubmitting]      = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [success,         setSuccess]         = useState(false)

  // Redirect to /login after success
  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => navigate('/login', { replace: true }), 3000)
    return () => clearTimeout(timer)
  }, [success, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError(t.errShort); return }
    if (password !== confirmPassword) { setError(t.errMismatch); return }

    setSubmitting(true)
    const errMsg = await updatePassword(password)
    setSubmitting(false)
    if (errMsg) {
      const low = errMsg.toLowerCase()
      setError(
        low.includes('expired') || low.includes('invalid') ? t.errExpired : t.errGeneric,
      )
    } else {
      setSuccess(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--surface)' }}>
      <div className="fixed top-0 left-0 right-0 h-3 bg-flag-stripe" />

      <div className="w-full max-w-sm">
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
            {success ? (
              <div className="rounded-xl px-3 py-3 text-sm"
                style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-text)' }}>
                ✓ {t.successMsg}
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* New password */}
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {t.newPassword}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="••••••••"
                      style={{ ...inputStyle, paddingRight: 40 }}
                      onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                      onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                      style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                      tabIndex={-1}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <PasswordStrength password={password} lang={language} />
                </div>

                {/* Confirm */}
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {t.confirmPassword}
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    style={{
                      ...inputStyle,
                      borderColor: confirmPassword && confirmPassword !== password
                        ? 'var(--danger)'
                        : 'var(--border)',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>

                {error && (
                  <div className="rounded-xl px-3 py-2 text-sm space-y-1"
                    style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger-text)' }}>
                    <p>{error}</p>
                    <Link to="/reset-password" className="underline text-xs font-medium block"
                      style={{ color: 'var(--danger-text)' }}>
                      {t.getNewLink}
                    </Link>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !password || !confirmPassword}
                  className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-colors disabled:opacity-40"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  {submitting ? t.saving : t.save}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
