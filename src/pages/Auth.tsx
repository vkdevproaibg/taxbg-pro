import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { enableLocalAdminSession } from '../hooks/useAuth'
import { useAuthStore } from '../store/authStore'
import { useUserStore } from '../store/userStore'

const GOOGLE_LABELS = {
  login:    { ru: 'Войти через Google',            en: 'Sign in with Google',  bg: 'Влез с Google',            uk: 'Увійти через Google' },
  register: { ru: 'Зарегистрироваться через Google', en: 'Sign up with Google',   bg: 'Регистрация с Google',      uk: 'Зареєструватися через Google' },
} as const

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

type Mode = 'login' | 'register' | 'reset'

const ERROR_TRANSLATIONS: Record<string, string> = {
  'Invalid login credentials':                 'Неверный email или пароль',
  'Email not confirmed':                        'Подтвердите email — проверьте почту',
  'User already registered':                    'Пользователь с таким email уже существует',
  'Password should be at least 6 characters':  'Пароль должен быть не менее 6 символов',
}

export default function Auth() {
  const isDev = import.meta.env.DEV
  const [mode,     setMode]     = useState<Mode>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState<string | null>(null)

  const { signIn, signUp, signInWithGoogle, isDemo, isLoading } = useAuthStore()
  const language = useUserStore(s => s.language)
  const navigate = useNavigate()

  // Redirect when auth state settles to authenticated
  useEffect(() => {
    if (!isLoading && !isDemo) {
      navigate('/')
    }
  }, [isDemo, isLoading, navigate])

  const reset = () => { setError(null); setSuccess(null) }

  const handleAdminLogin = () => {
    reset()
    enableLocalAdminSession()
    window.location.reload()
  }

  const handleSubmit = async () => {
    reset(); setLoading(true)
    try {
      if (mode === 'register') {
        const errMsg = await signUp(email, password)
        if (errMsg) throw new Error(errMsg)
        setSuccess('Письмо с подтверждением отправлено на ' + email)
        setLoading(false)
      } else if (mode === 'reset') {
        if (!supabase) throw new Error('Supabase не настроен')
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) throw error
        setSuccess('Инструкции отправлены на ' + email)
        setLoading(false)
      } else {
        const errMsg = await signIn(email, password)
        if (errMsg) throw new Error(errMsg)
        // Don't navigate manually — useEffect above watches isDemo
        // loading stays true until auth state settles
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка авторизации'
      setError(ERROR_TRANSLATIONS[msg] ?? msg)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-folk-pattern flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--surface)' }}>

      {/* Flag stripe top */}
      <div className="fixed top-0 left-0 right-0 h-3 bg-flag-stripe" />

      <div className="w-full max-w-sm">
        {/* Logo card */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4"
            style={{ backgroundColor: 'var(--accent)' }}>
            <span className="text-3xl">🌹</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            TaxBG Pro
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Данъчен учет в България · 2026
          </p>
          {/* Flag stripe */}
          <div className="mt-4 mx-auto w-24 h-2 rounded-full bg-flag-stripe" />
        </div>

        {/* Auth card */}
        <div className="rounded-2xl shadow-lg overflow-hidden"
          style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>

          {/* Tabs */}
          {mode !== 'reset' && (
            <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
              {(['login', 'register'] as Mode[]).map((m) => (
                <button key={m}
                  onClick={() => { setMode(m); reset() }}
                  className="flex-1 py-3 text-sm font-medium transition-colors"
                  style={{
                    color: mode === m ? 'var(--accent)' : 'var(--text-muted)',
                    borderBottom: mode === m ? '2px solid var(--accent)' : '2px solid transparent',
                    backgroundColor: 'transparent',
                  }}>
                  {m === 'login' ? 'Войти' : 'Регистрация'}
                </button>
              ))}
            </div>
          )}

          <div className="p-6 space-y-4">
            {mode === 'reset' && (
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Сброс пароля
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Введите email — вышлем инструкции
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium"
                  style={{ color: 'var(--text-secondary)' }}>Email</label>
                <input type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="you@example.com"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                  style={{
                    border: '1.5px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
              {mode !== 'reset' && (
                <div>
                  <label className="mb-1 block text-xs font-medium"
                    style={{ color: 'var(--text-secondary)' }}>Пароль</label>
                  <input type="password" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="••••••••"
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                    style={{
                      border: '1.5px solid var(--border)',
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text-primary)',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-xl px-3 py-2 text-sm"
                style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger-text)' }}>
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl px-3 py-2 text-sm"
                style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-text)' }}>
                {success}
              </div>
            )}

            <button onClick={handleSubmit}
              disabled={loading || !email || (mode !== 'reset' && !password)}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-colors disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent)' }}
              onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--accent-dark)'}
              onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--accent)'}>
              {loading ? '...' :
                mode === 'login'    ? 'Войти' :
                mode === 'register' ? 'Создать аккаунт' : 'Отправить'}
            </button>

            {isSupabaseConfigured && mode !== 'reset' && (
              <button
                onClick={() => signInWithGoogle()}
                className="w-full rounded-xl border flex items-center justify-center gap-2.5 py-2.5 text-sm font-medium transition-colors"
                style={{
                  borderColor: '#e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
              >
                <GoogleIcon />
                {GOOGLE_LABELS[mode as 'login' | 'register'][language] ?? GOOGLE_LABELS[mode as 'login' | 'register']['en']}
              </button>
            )}

            {isDev && (
              <button
                onClick={handleAdminLogin}
                className="w-full rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--surface)',
                }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--accent-light)'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--surface)'}
              >
                Войти как админ (локально)
              </button>
            )}

            <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              {mode !== 'reset' ? (
                <button onClick={() => { setMode('reset'); reset() }}
                  className="underline hover:opacity-80">
                  Забыли пароль?
                </button>
              ) : (
                <button onClick={() => { setMode('login'); reset() }}
                  className="underline hover:opacity-80">
                  ← Назад к входу
                </button>
              )}
              <span>🇧🇬 Болгария · 2026</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          или{' '}
          <button
            onClick={() => navigate('/')}
            className="underline"
            style={{ color: 'var(--accent)' }}>
            продолжить без входа
          </button>
          {' '}(демо-режим)
        </p>
      </div>
    </div>
  )
}
