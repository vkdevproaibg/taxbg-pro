import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { enableLocalAdminSession } from '../hooks/useAuth'
import { useAuthStore } from '../store/authStore'

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

  const { signIn, signUp, isDemo, isLoading } = useAuthStore()
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
