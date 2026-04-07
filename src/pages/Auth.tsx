import { useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type Mode = 'login' | 'register'

export default function Auth() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async () => {
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase не настроен: добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env')
      }

      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Письмо с подтверждением отправлено на ' + email)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка авторизации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <div className="mb-2 text-4xl">🇧🇬</div>
          <h1 className="text-xl font-bold text-slate-800">TaxBG Pro</h1>
          <p className="mt-1 text-sm text-slate-400">Налоговый учёт в Болгарии</p>
        </div>

        <div className="flex rounded-xl bg-slate-100 p-1">
          {(['login', 'register'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => {
                setMode(m)
                setError(null)
                setSuccess(null)
              }}
              className={`flex-1 rounded-lg py-2 text-sm transition-colors ${
                mode === m ? 'bg-white font-medium shadow-sm' : 'text-slate-500'
              }`}
            >
              {m === 'login' ? 'Войти' : 'Регистрация'}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-violet-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-violet-400 focus:outline-none"
            />
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {success && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600">{success}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading || !email || !password}
          className="w-full rounded-xl bg-violet-600 py-3 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40"
        >
          {loading ? '...' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
        </button>

        <p className="text-center text-xs text-slate-400">
          Данные хранятся локально. Синхронизация между устройствами - скоро.
        </p>
      </div>
    </div>
  )
}
