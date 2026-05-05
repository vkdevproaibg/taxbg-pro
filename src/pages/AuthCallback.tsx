import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useUserStore } from '../store/userStore'
import { Link } from 'react-router-dom'

const UI = {
  ru: { loading: 'Входим…', error: 'Не удалось войти через Google.', backToLogin: '← Вернуться к входу' },
  uk: { loading: 'Входимо…', error: 'Не вдалося увійти через Google.', backToLogin: '← Повернутись до входу' },
  en: { loading: 'Signing in…', error: 'Could not sign in with Google.', backToLogin: '← Back to sign in' },
  bg: { loading: 'Влизаме…', error: 'Не успяхме да влезем с Google.', backToLogin: '← Обратно към вход' },
} as const

export default function AuthCallback() {
  const language = useUserStore((s) => s.language)
  const fetchProfile = useAuthStore((s) => s.fetchProfile)
  const navigate = useNavigate()
  const t = UI[language]
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setError('Supabase не настроен')
      return
    }

    // Supabase automatically parses the URL hash/code and establishes
    // the session. We just need to listen for SIGNED_IN.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await fetchProfile()
          navigate('/', { replace: true })
        } else if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
          setError(t.error)
        }
      },
    )

    // Safety timeout — if auth doesn't fire within 10s, show error
    const timeout = setTimeout(() => setError(t.error), 10_000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--surface)' }}>
      <div className="fixed top-0 left-0 right-0 h-3 bg-flag-stripe" />

      <div className="text-center space-y-4">
        {error ? (
          <>
            <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
            <Link to="/login" className="text-sm underline" style={{ color: 'var(--accent)' }}>
              {t.backToLogin}
            </Link>
          </>
        ) : (
          <>
            <div className="text-4xl animate-pulse">🌹</div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.loading}</p>
          </>
        )}
      </div>
    </div>
  )
}
