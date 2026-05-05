import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Session, User } from '@supabase/supabase-js'
import {
  findPendingTransfersForEmail,
  type PendingTransferSummary,
} from '../lib/companyTransfer'

interface Profile {
  id: string
  role: 'superadmin' | 'superuser' | 'owner' |
        'accountant' | 'director' | 'free'
  language: 'ru' | 'uk' | 'en' | 'bg'
  llm_mode: 'own_key' | 'platform'
  subscription: 'free' | 'pro'
  full_name: string | null
}

// ---------------------------------------------------------------------------
// Audit logging helper — non-fatal, fire-and-forget
// ---------------------------------------------------------------------------
async function logAuthEvent(
  action: string,
  meta: Record<string, unknown> = {},
) {
  if (!supabase) return
  try {
    const user = useAuthStore.getState().user
    await supabase.from('audit_events').insert({
      actor_profile_id: user?.id ?? null,
      entity_type: 'auth',
      action,
      after_json: { email: user?.email ?? meta.email ?? null, ...meta },
    })
  } catch { /* non-fatal */ }
}

interface AuthState {
  session:     Session | null
  user:        User | null
  profile:     Profile | null
  isLoading:   boolean
  isDemo:      boolean  // true = unauthenticated demo mode
  pendingTransfers: PendingTransferSummary[]

  initialize:  () => Promise<void>
  signIn:      (email: string, password: string) => Promise<string | null>
  signUp:      (email: string, password: string, language?: string) => Promise<string | null>
  signInWithGoogle: () => Promise<string | null>
  signOut:     () => Promise<void>
  resetPassword: (email: string) => Promise<string | null>
  updatePassword: (newPassword: string) => Promise<string | null>
  resendConfirmation: (email: string) => Promise<string | null>
  fetchProfile: () => Promise<void>
  refreshPendingTransfers: () => Promise<void>
  dismissPendingTransfer: (id: string) => void

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
  pendingTransfers: [],

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
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Handled by UpdatePassword page — just store session
        if (session) set({ session, user: session.user, isDemo: false })
        return
      }
      if (event === 'TOKEN_REFRESHED' && session) {
        set({ session })
        return
      }
      if (event === 'SIGNED_IN' && session) {
        set({ session, user: session.user, isDemo: false })
        await get().fetchProfile()
        return
      }
      if (event === 'SIGNED_OUT') {
        set({ session: null, user: null, profile: null, isDemo: true })
        // Clear all other stores
        try {
          const { useCompaniesStore } = await import('./companiesStore')
          useCompaniesStore.getState().reset?.()
        } catch { /* non-fatal */ }
        return
      }
      // Fallback: keep existing behaviour
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
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      logAuthEvent('auth_sign_in_failed', {
        email,
        reason: error.message.includes('confirm') ? 'email_not_confirmed' : 'invalid_credentials',
      })
      return error.message
    }
    logAuthEvent('auth_sign_in', { email, provider: 'email' })
    return null
  },

  signUp: async (email, password, language = 'ru') => {
    if (!supabase) return 'Supabase не настроен'
    set({ isLoading: true })
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { language } },
    })
    set({ isLoading: false })
    if (error) return error.message
    logAuthEvent('auth_sign_up', { email, provider: 'email' })
    return null
  },

  signInWithGoogle: async () => {
    if (!supabase) return 'Supabase не настроен'
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    })
    return error ? error.message : null
  },

  signOut: async () => {
    if (!supabase) return
    const email = useAuthStore.getState().user?.email
    await supabase.auth.signOut({ scope: 'global' })
    if (email) logAuthEvent('auth_sign_out', { email })
    set({ session: null, user: null, profile: null, isDemo: true })
  },

  resetPassword: async (email) => {
    if (!supabase) return 'Supabase не настроен'
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/update-password',
    })
    if (error) return error.message
    logAuthEvent('auth_password_reset_requested', { email })
    return null
  },

  updatePassword: async (newPassword) => {
    if (!supabase) return 'Supabase не настроен'
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return error.message
    const email = useAuthStore.getState().user?.email
    logAuthEvent('auth_password_changed', { email })
    return null
  },

  resendConfirmation: async (email) => {
    if (!supabase) return 'Supabase не настроен'
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    return error ? error.message : null
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

      // Check for pending company transfers addressed to this user
      await get().refreshPendingTransfers()

      // Fire-and-forget daily snapshot for active company
      try {
        const { useCompaniesStore } = await import('./companiesStore')
        const companyId = useCompaniesStore.getState().activeCompanyId
        const clientAccountId = useCompaniesStore.getState().clientAccountId
        if (companyId && data.id) {
          const { createDailySnapshotIfNeeded } = await import('../lib/dataSnapshot')
          createDailySnapshotIfNeeded(data.id, clientAccountId, companyId).catch(err =>
            console.warn('[authStore] daily snapshot failed:', err)
          )
        }
      } catch { /* non-fatal */ }
    }

    set({ isLoading: false })
  },

  refreshPendingTransfers: async () => {
    const email = get().user?.email
    if (!email) {
      set({ pendingTransfers: [] })
      return
    }
    try {
      const pending = await findPendingTransfersForEmail(email)
      set({ pendingTransfers: pending })
    } catch (err) {
      console.warn('[authStore] refreshPendingTransfers failed:', err)
    }
  },

  dismissPendingTransfer: (id: string) => {
    set((s) => ({
      pendingTransfers: s.pendingTransfers.filter((t) => t.id !== id),
    }))
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
