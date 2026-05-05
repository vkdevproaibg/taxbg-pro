import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useUserStore } from '../store/userStore'

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------
const UI = {
  ru: {
    title: 'Вход в TaxBG Pro',
    subtitle: 'Болгарское налоговое право 2026',
    email: 'Email',
    password: 'Пароль',
    login: 'Войти',
    loading: 'Входим…',
    google: 'Войти через Google',
    forgotPassword: 'Забыли пароль?',
    noAccount: 'Нет аккаунта?',
    registerLink: 'Зарегистрироваться',
    errInvalid: 'Неверный email или пароль',
    errNotConfirmed: 'Подтвердите email. Отправить письмо повторно?',
    errNetwork: 'Проверьте подключение к интернету',
    errGeneric: 'Ошибка входа. Попробуйте ещё раз.',
    resend: 'Отправить повторно',
    resendOk: 'Письмо отправлено',
    pendingTransfer: (n: number) =>
      `У вас ${n} ожидающих передач компании. Проверьте раздел "Компании".`,
  },
  uk: {
    title: 'Вхід у TaxBG Pro',
    subtitle: 'Болгарське податкове право 2026',
    email: 'Email',
    password: 'Пароль',
    login: 'Увійти',
    loading: 'Входимо…',
    google: 'Увійти через Google',
    forgotPassword: 'Забули пароль?',
    noAccount: 'Немає акаунту?',
    registerLink: 'Зареєструватись',
    errInvalid: 'Невірний email або пароль',
    errNotConfirmed: 'Підтвердіть email. Надіслати листа повторно?',
    errNetwork: 'Перевірте підключення до інтернету',
    errGeneric: 'Помилка входу. Спробуйте ще раз.',
    resend: 'Надіслати повторно',
    resendOk: 'Листа надіслано',
    pendingTransfer: (n: number) =>
      `У вас ${n} очікуючих передач компанії. Перевірте розділ «Компанії».`,
  },
  en: {
    title: 'Sign in to TaxBG Pro',
    subtitle: 'Bulgarian Tax Law 2026',
    email: 'Email',
    password: 'Password',
    login: 'Sign in',
    loading: 'Signing in…',
    google: 'Sign in with Google',
    forgotPassword: 'Forgot password?',
    noAccount: "Don't have an account?",
    registerLink: 'Register',
    errInvalid: 'Invalid email or password',
    errNotConfirmed: 'Please confirm your email. Resend confirmation?',
    errNetwork: 'Check your internet connection',
    errGeneric: 'Login error. Please try again.',
    resend: 'Resend',
    resendOk: 'Email sent',
    pendingTransfer: (n: number) =>
      `You have ${n} pending company transfer(s). Check the "Companies" section.`,
  },
  bg: {
    title: 'Вход в TaxBG Pro',
    subtitle: 'Българско данъчно право 2026',
    email: 'Email',
    password: 'Парола',
    login: 'Влез',
    loading: 'Влизаме…',
    google: 'Влез с Google',
    forgotPassword: 'Забравена парола?',
    noAccount: 'Нямаш акаунт?',
    registerLink: 'Регистрирай се',
    errInvalid: 'Невалиден email или парола',
    errNotConfirmed: 'Потвърди email. Изпрати потвърждение отново?',
    errNetwork: 'Провери интернет връзката',
    errGeneric: 'Грешка при вход. Опитай отново.',
    resend: 'Изпрати отново',
    resendOk: 'Писмото е изпратено',
    pendingTransfer: (n: number) =>
      `Имате ${n} чакащи прехвърляния на компания. Проверете секция "Компании".`,
  },
} as const

type UIStrings = typeof UI[keyof typeof UI]

function translateError(msg: string, t: UIStrings): { text: string; notConfirmed: boolean } {
  const low = msg.toLowerCase()
  if (low.includes('invalid') || low.includes('credentials') || low.includes('wrong password')) {
    return { text: t.errInvalid, notConfirmed: false }
  }
  if (low.includes('confirm') || low.includes('not confirmed') || low.includes('email_not_confirmed')) {
    return { text: t.errNotConfirmed, notConfirmed: true }
  }
  if (low.includes('network') || low.includes('fetch') || low.includes('failed to fetch')) {
    return { text: t.errNetwork, notConfirmed: false }
  }
  return { text: t.errGeneric, notConfirmed: false }
}

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

export default function Login() {
  const language = useUserStore((s) => s.language)
  const signIn = useAuthStore((s) => s.signIn)
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle)
  const resendConfirmation = useAuthStore((s) => s.resendConfirmation)
  const isLoading = useAuthStore((s) => s.isLoading)
  const isDemo = useAuthStore((s) => s.isDemo)
  const pendingCount = useAuthStore((s) => s.pendingTransfers.length)
  const navigate = useNavigate()
  const t = UI[language]

  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [notConfirmed, setNotConfirmed] = useState(false)
  const [resendDone,   setResendDone]   = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && !isDemo) navigate('/', { replace: true })
  }, [isLoading, isDemo, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotConfirmed(false)
    setSubmitting(true)
    const errMsg = await signIn(email, password)
    setSubmitting(false)
    if (errMsg) {
      const { text, notConfirmed: nc } = translateError(errMsg, t)
      setError(text)
      setNotConfirmed(nc)
    }
    // On success onAuthStateChange fires → isDemo becomes false → redirect via useEffect
  }

  const handleGoogle = async () => {
    setError(null)
    const errMsg = await signInWithGoogle()
    if (errMsg) setError(errMsg)
  }

  const handleResend = async () => {
    const errMsg = await resendConfirmation(email)
    if (!errMsg) setResendDone(true)
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.target.style.borderColor = 'var(--accent)')
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.target.style.borderColor = 'var(--border)')

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
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{t.subtitle}</p>
          <div className="mt-4 mx-auto w-24 h-2 rounded-full bg-flag-stripe" />
        </div>

        {/* Card */}
        <div className="rounded-2xl shadow-lg overflow-hidden"
          style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
          <div className="px-6 pt-5 pb-2">
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t.title}
            </h2>
          </div>

          <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
            {/* Pending transfer notification */}
            {pendingCount > 0 && (
              <div className="rounded-xl px-3 py-2 text-sm"
                style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-text)' }}>
                {t.pendingTransfer(pendingCount)}
              </div>
            )}

            {/* Email */}
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
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {t.password}
                </label>
                <Link to="/reset-password" className="text-xs underline" style={{ color: 'var(--accent)' }}>
                  {t.forgotPassword}
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight: 40 }}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
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
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl px-3 py-2 text-sm space-y-1"
                style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger-text)' }}>
                <p>{error}</p>
                {notConfirmed && !resendDone && (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="underline text-xs font-medium"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger-text)' }}
                  >
                    {t.resend}
                  </button>
                )}
                {resendDone && (
                  <p className="text-xs font-medium">✓ {t.resendOk}</p>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-colors disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {submitting ? t.loading : t.login}
            </button>

            {/* Google OAuth */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={submitting}
              className="w-full rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
              style={{
                border: '1.5px solid var(--border)',
                backgroundColor: '#fff',
                color: '#3c4043',
              }}
            >
              <GoogleIcon />
              {t.google}
            </button>

            {/* Register link */}
            <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              {t.noAccount}{' '}
              <Link to="/register" className="font-medium underline" style={{ color: 'var(--accent)' }}>
                {t.registerLink}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.805.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
