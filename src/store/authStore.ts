import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

interface Profile {
  id: string
  role: 'superadmin' | 'superuser' | 'owner' |
        'accountant' | 'director' | 'free'
  language: 'ru' | 'uk' | 'en' | 'bg'
  llm_mode: 'own_key' | 'platform'
  subscription: 'free' | 'pro'
  full_name: string | null
}

interface AuthState {
  session:     Session | null
  user:        User | null
  profile:     Profile | null
  isLoading:   boolean
  isDemo:      boolean  // true = unauthenticated demo mode

  initialize:  () => Promise<void>
  signIn:      (email: string, password: string) => Promise<string | null>
  signUp:      (email: string, password: string, language?: string) => Promise<string | null>
  signOut:     () => Promise<void>
  fetchProfile: () => Promise<void>

  // Helpers
  isSuperAdmin: () => boolean
  isSuperUser:  () => boolean
  isPro:        () => boolean
  canEdit:      () => boolean  // false in demo mode
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session:   null,
  user:      null,
  profile:   null,
  isLoading: true,
  isDemo:    true,

  initialize: async () => {
    if (!supabase) {
      // Supabase not configured — stay in demo mode
      set({ isLoading: false, isDemo: true })
      return
    }

    set({ isLoading: true })

    // Get current session
    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
      set({ session, user: session.user, isDemo: false })
      await get().fetchProfile()
    } else {
      set({ isDemo: true })
    }

    set({ isLoading: false })

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        set({ session, user: session.user, isDemo: false })
        await get().fetchProfile()
      } else {
        set({ session: null, user: null, profile: null, isDemo: true })
      }
    })
  },

  signIn: async (email, password) => {
    if (!supabase) return 'Supabase не настроен'
    const { error } = await supabase.auth.signInWithPassword({
      email, password
    })
    // Don't set isLoading: false here —
    // onAuthStateChange → fetchProfile will do it
    return error ? error.message : null
  },

  signUp: async (email, password, language = 'ru') => {
    if (!supabase) return 'Supabase не настроен'
    set({ isLoading: true })
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { language }
      }
    })
    set({ isLoading: false })
    return error ? error.message : null
  },

  signOut: async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null, isDemo: true })
  },

  fetchProfile: async () => {
    if (!supabase) return
    const { user } = get()
    if (!user) return

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!error && data) {
      set({ profile: data as Profile })

      // Sync language to local store
      const { useUserStore } = await import('./userStore')
      const localLang = useUserStore.getState().language
      if (data.language && data.language !== localLang) {
        useUserStore.getState().setLanguage(data.language)
      }

      // Initialize companies from Supabase
      const { useCompaniesStore } = await import('./companiesStore')
      await useCompaniesStore.getState().initFromSupabase(get().user!.id)

      // Initialize integrations from Supabase
      const { useIntegrationsStore } = await import('./integrationsStore')
      await useIntegrationsStore.getState().initFromSupabase(user.id)

      // Initialize learning progress from Supabase
      const { useLearningStore } = await import('./learningStore')
      await useLearningStore.getState().initFromSupabase(user.id)

      // Load tax rate versions (non-fatal — calculations fall back
      // to static TAX_RATES_2026 if this fails)
      try {
        const { loadTaxRates } = await import('../lib/taxRates')
        await loadTaxRates()
      } catch (err) {
        console.warn('[authStore] loadTaxRates failed:', err)
      }
    }

    set({ isLoading: false })
  },

  isSuperAdmin: () => get().profile?.role === 'superadmin',
  isSuperUser:  () => get().profile?.role === 'superuser',
  isPro:        () => {
    const role = get().profile?.role
    return role === 'superadmin' || role === 'superuser' ||
           get().profile?.subscription === 'pro'
  },
  canEdit: () => {
    const { isDemo, profile } = get()
    if (isDemo) return false
    if (!profile) return true  // authenticated but profile not loaded yet — allow
    // superadmin and superuser bypass everything
    if (profile.role === 'superadmin' ||
        profile.role === 'superuser') return true
    // pro subscribers can edit
    if (profile.subscription === 'pro') return true
    // temporarily allow all authenticated users
    // paywall will be added in Stage 5
    return true
  },
}))
