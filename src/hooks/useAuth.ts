import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

const ADMIN_SESSION_KEY = 'taxbg-dev-admin-session'
const IS_DEV = import.meta.env.DEV

function buildLocalAdminUser(): User {
  return {
    id: 'local-admin',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'vkdevproai@gmail.com',
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: 'local-admin' },
    user_metadata: { role: 'admin', local: true },
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_anonymous: false,
  } as unknown as User
}

export function enableLocalAdminSession(): void {
  if (!IS_DEV) return
  localStorage.setItem(ADMIN_SESSION_KEY, '1')
}

function hasLocalAdminSession(): boolean {
  if (!IS_DEV) return false
  return localStorage.getItem(ADMIN_SESSION_KEY) === '1'
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (hasLocalAdminSession()) {
      setUser(buildLocalAdminUser())
      setLoading(false)
      return
    }

    if (!supabase) {
      setUser(null)
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = () => {
    localStorage.removeItem(ADMIN_SESSION_KEY)
    if (!supabase) return Promise.resolve({ error: null })
    return supabase.auth.signOut()
  }

  return { user, loading, signOut }
}
