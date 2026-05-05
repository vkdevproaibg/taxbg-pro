import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useUserStore } from '../store/userStore'
import type { AppLanguage } from '../store/userStore'
import PasswordStrength from '../components/ui/PasswordStrength'

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------
const UI = {
  ru: {
    title: 'Создать аккаунт',
    subtitle: 'TaxBG Pro · Болгарское налоговое право 2026',
    email: 'Email',
    password: 'Пароль',
    confirmPassword: 'Подтвердите пароль',
    language: 'Язык интерфейса',
    terms: (a: string, b: string) =>
      `Я прочитал и принимаю ${a}Условия использования${c(a)} и ${b}Политику конфиденциальности${c(b)}`,
    register: 'Создать аккаунт',
    loading: 'Создаём аккаунт…',
    google: 'Войти через Google',
    hasAccount: 'Уже есть аккаунт?',
    loginLink: 'Войти',
    successTitle: 'Проверьте email',
    successMsg: (email: string) =>
      `Ссылка для подтверждения отправлена на ${email}. Переход на страницу входа через 5 секунд…`,
    errShortPassword: 'Пароль должен быть не менее 8 символов',
    errPasswordMismatch: 'Пароли не совпадают',
    errTerms: 'Примите условия использования',
    errEmailTaken: 'Пользователь с таким email уже существует',
    errNetwork: 'Проверьте подключение к интернету',
    errGeneric: 'Ошибка регистрации. Попробуйте ещё раз.',
  },
  uk: {
    title: 'Створити акаунт',
    subtitle: 'TaxBG Pro · Болгарське податкове право 2026',
    email: 'Email',
    password: 'Пароль',
    confirmPassword: 'Підтвердіть пароль',
    language: 'Мова інтерфейсу',
    terms: (a: string, b: string) =>
      `Я прочитав і приймаю ${a}Умови використання${c(a)} та ${b}Політику конфіденційності${c(b)}`,
    register: 'Створити акаунт',
    loading: 'Створюємо акаунт…',
    google: 'Увійти через Google',
    hasAccount: 'Вже є акаунт?',
    loginLink: 'Увійти',
    successTitle: 'Перевірте email',
    successMsg: (email: string) =>
      `Посилання для підтвердження надіслано на ${email}. Перехід на сторінку входу через 5 секунд…`,
    errShortPassword: 'Пароль має бути не менше 8 символів',
    errPasswordMismatch: 'Паролі не збігаються',
    errTerms: 'Прийміть умови використання',
    errEmailTaken: 'Користувач з таким email вже існує',
    errNetwork: 'Перевірте підключення до інтернету',
    errGeneric: 'Помилка реєстрації. Спробуйте ще раз.',
  },
  en: {
    title: 'Create account',
    subtitle: 'TaxBG Pro · Bulgarian Tax Law 2026',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    language: 'Interface language',
    terms: (a: string, b: string) =>
      `I have read and accept the ${a}Terms of Use${c(a)} and ${b}Privacy Policy${c(b)}`,
    register: 'Create account',
    loading: 'Creating account…',
    google: 'Sign in with Google',
    hasAccount: 'Already have an account?',
    loginLink: 'Sign in',
    successTitle: 'Check your email',
    successMsg: (email: string) =>
      `A confirmation link was sent to ${email}. Redirecting to login in 5 seconds…`,
    errShortPassword: 'Password must be at least 8 characters',
    errPasswordMismatch: 'Passwords do not match',
    errTerms: 'Please accept the terms',
    errEmailTaken: 'A user with this email already exists',
    errNetwork: 'Check your internet connection',
    errGeneric: 'Registration error. Please try again.',
  },
  bg: {
    title: 'Създаване на акаунт',
    subtitle: 'TaxBG Pro · Българско данъчно право 2026',
    email: 'Email',
    password: 'Парола',
    confirmPassword: 'Потвърдете паролата',
    language: 'Език на интерфейса',
    terms: (a: string, b: string) =>
      `Прочетох и приемам ${a}Условията за ползване${c(a)} и ${b}Политиката за поверителност${c(b)}`,
    register: 'Създай акаунт',
    loading: 'Създаваме акаунт…',
    google: 'Влез с Google',
    hasAccount: 'Вече имаш акаунт?',
    loginLink: 'Влез',
    successTitle: 'Провери email',
    successMsg: (email: string) =>
      `Линк за потвърждение е изпратен на ${email}. Пренасочване към вход след 5 секунди…`,
    errShortPassword: 'Паролата трябва да е поне 8 символа',
    errPasswordMismatch: 'Паролите не съвпадат',
    errTerms: 'Приемете условията за ползване',
    errEmailTaken: 'Потребител с този email вече съществува',
    errNetwork: 'Проверете връзката си с интернет',
    errGeneric: 'Грешка при регистрация. Опитайте отново.',
  },
} as const

// Tiny helper to avoid JSX string-interp issues
const c = (_: string) => ''

const LANGS: { value: AppLanguage; label: string }[] = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
  { value: 'bg', label: 'Български' },
  { value: 'uk', label: 'Українська' },
]

function detectLanguage(): AppLanguage {
  const nav = navigator.language.slice(0, 2).toLowerCase()
  if (nav === 'uk') return 'uk'
  if (nav === 'bg') return 'bg'
  if (nav === 'en') return 'en'
  return 'ru'
}

type UIStrings = typeof UI[keyof typeof UI]

function translateError(msg: string, t: UIStrings): string {
  if (msg.includes('already registered') || msg.includes('already exists')) return t.errEmailTaken
  if (msg.includes('network') || msg.includes('fetch')) return t.errNetwork
  return t.errGeneric
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

export default function Register() {
  const language = useUserStore((s) => s.language)
  const setLanguage = useUserStore((s) => s.setLanguage)
  const signUp = useAuthStore((s) => s.signUp)
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle)
  const isLoading = useAuthStore((s) => s.isLoading)
  const isDemo = useAuthStore((s) => s.isDemo)
  const navigate = useNavigate()
  const t = UI[language]

  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword,    setShowPassword]    = useState(false)
  const [termsAccepted,   setTermsAccepted]   = useState(false)
  const [submitting,      setSubmitting]      = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [success,         setSuccess]         = useState(false)
  const [countdown,       setCountdown]       = useState(5)

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && !isDemo) navigate('/', { replace: true })
  }, [isLoading, isDemo, navigate])

  // Auto-detect language on mount
  useEffect(() => {
    const detected = detectLanguage()
    if (detected !== language) setLanguage(detected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Countdown after success
  useEffect(() => {
    if (!success) return
    if (countdown <= 0) { navigate('/login', { replace: true }); return }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [success, countdown, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) { setError(t.errShortPassword); return }
    if (password !== confirmPassword) { setError(t.errPasswordMismatch); return }
    if (!termsAccepted) { setError(t.errTerms); return }

    setSubmitting(true)
    const errMsg = await signUp(email, password, language)
    setSubmitting(false)
    if (errMsg) {
      setError(translateError(errMsg, t))
    } else {
      setSuccess(true)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    const errMsg = await signInWithGoogle()
    if (errMsg) setError(errMsg)
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    ((e.target as HTMLElement).style.borderColor = 'var(--accent)')
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    ((e.target as HTMLElement).style.borderColor = 'var(--border)')

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--surface)' }}>
        <div className="fixed top-0 left-0 right-0 h-3 bg-flag-stripe" />
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-5xl">✉️</div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t.successTitle}
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t.successMsg(email).replace(/через \d+ секунд/, `через ${countdown} сек`)}
          </p>
        </div>
      </div>
    )
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
            {/* Language */}
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {t.language}
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as AppLanguage)}
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              >
                {LANGS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>

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
              <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {t.password}
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
              <PasswordStrength password={password} lang={language} />
            </div>

            {/* Confirm password */}
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
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2 cursor-pointer text-xs"
              style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 shrink-0 accent-[color:var(--accent)]"
              />
              <span>
                Я прочитал и принимаю{' '}
                <Link to="/terms" className="underline" style={{ color: 'var(--accent)' }}>
                  {language === 'en' ? 'Terms of Use' : language === 'bg' ? 'Условия за ползване' : language === 'uk' ? 'Умови використання' : 'Условия использования'}
                </Link>
                {' '}и{' '}
                <Link to="/privacy" className="underline" style={{ color: 'var(--accent)' }}>
                  {language === 'en' ? 'Privacy Policy' : language === 'bg' ? 'Политика за поверителност' : language === 'uk' ? 'Політику конфіденційності' : 'Политику конфиденциальности'}
                </Link>
              </span>
            </label>

            {/* Error */}
            {error && (
              <div className="rounded-xl px-3 py-2 text-sm"
                style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger-text)' }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !email || !password || !confirmPassword || !termsAccepted}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-colors disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {submitting ? t.loading : t.register}
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

            {/* Footer link */}
            <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              {t.hasAccount}{' '}
              <Link to="/login" className="font-medium underline" style={{ color: 'var(--accent)' }}>
                {t.loginLink}
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
