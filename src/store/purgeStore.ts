import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'

const PURGE_GRACE_DAYS = 90

interface PurgeState {
  purgeRequestedAt: string | null
  purgeScheduledAt: string | null
  loaded: boolean
  hydrateFromSupabase: () => Promise<void>
  requestPurge: () => Promise<string | null>
  cancelPurge: () => Promise<string | null>
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}

async function logAudit(action: 'purge_requested' | 'purge_cancelled', after: Record<string, unknown>) {
  if (!supabase) return
  const { user, isDemo } = useAuthStore.getState()
  if (isDemo || !user) return
  try {
    await supabase.from('audit_events').insert({
      actor_profile_id: user.id,
      entity_type: 'profile',
      action,
      after_json: after,
    })
  } catch (e) {
    console.warn('[purgeStore] audit_events insert failed', e)
  }
}

export const usePurgeStore = create<PurgeState>()(
  persist(
    (set, get) => ({
      purgeRequestedAt: null,
      purgeScheduledAt: null,
      loaded: false,

      hydrateFromSupabase: async () => {
        if (!supabase) {
          set({ loaded: true })
          return
        }
        const { user, isDemo } = useAuthStore.getState()
        if (isDemo || !user) {
          set({ loaded: true })
          return
        }
        const { data, error } = await supabase
          .from('profiles')
          .select('purge_requested_at, purge_scheduled_at')
          .eq('id', user.id)
          .single()
        if (error) {
          console.warn('[purgeStore] hydrate failed', error)
          set({ loaded: true })
          return
        }
        set({
          purgeRequestedAt: data?.purge_requested_at ?? null,
          purgeScheduledAt: data?.purge_scheduled_at ?? null,
          loaded: true,
        })
      },

      requestPurge: async () => {
        if (!supabase) return 'supabase_not_configured'
        const { user, isDemo } = useAuthStore.getState()
        if (isDemo || !user) return 'not_authenticated'

        if (get().purgeRequestedAt) return null

        const now = new Date().toISOString()
        const scheduled = addDays(now, PURGE_GRACE_DAYS)

        const { error } = await supabase
          .from('profiles')
          .update({
            purge_requested_at: now,
            purge_scheduled_at: scheduled,
          })
          .eq('id', user.id)

        if (error) {
          console.warn('[purgeStore] requestPurge failed', error)
          return error.message
        }

        set({ purgeRequestedAt: now, purgeScheduledAt: scheduled })
        void logAudit('purge_requested', { requestedAt: now, scheduledAt: scheduled })
        return null
      },

      cancelPurge: async () => {
        if (!supabase) return 'supabase_not_configured'
        const { user, isDemo } = useAuthStore.getState()
        if (isDemo || !user) return 'not_authenticated'

        if (!get().purgeRequestedAt) return null

        const { error } = await supabase
          .from('profiles')
          .update({
            purge_requested_at: null,
            purge_scheduled_at: null,
          })
          .eq('id', user.id)

        if (error) {
          console.warn('[purgeStore] cancelPurge failed', error)
          return error.message
        }

        set({ purgeRequestedAt: null, purgeScheduledAt: null })
        void logAudit('purge_cancelled', { cancelledAt: new Date().toISOString() })
        return null
      },
    }),
    {
      name: 'taxbg-purge',
      partialize: (state) => ({
        purgeRequestedAt: state.purgeRequestedAt,
        purgeScheduledAt: state.purgeScheduledAt,
      }),
    }
  )
)

export const PURGE_GRACE_PERIOD_DAYS = PURGE_GRACE_DAYS
