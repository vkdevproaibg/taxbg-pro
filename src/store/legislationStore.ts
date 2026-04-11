import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

export type LegislationSource = 'dv' | 'nap' | 'noi' | 'kik-info' | 'manual'
export type LegislationStatus = 'pending' | 'reviewing' | 'applied' | 'dismissed'

export interface LegislationAlert {
  id: string
  source: LegislationSource
  source_url: string | null
  title: string
  summary_bg: string | null
  summary_ru: string | null
  detected_keywords: string[] | null
  affected_rate_keys: string[] | null
  status: LegislationStatus
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  applied_rate_version_ids: string[] | null
  created_at: string
}

interface LegislationState {
  alerts: LegislationAlert[]
  isLoaded: boolean
  isLoading: boolean

  loadAlerts: () => Promise<void>
  addManualAlert: (
    title: string,
    summary_bg: string,
    summary_ru: string,
    affected_rate_keys: string[],
  ) => Promise<string | null>
  updateAlertStatus: (
    id: string,
    status: LegislationStatus,
    review_notes?: string,
  ) => Promise<string | null>
  applyRateChange: (args: {
    alertId: string
    rateKey: string
    newValue: number
    effectiveFrom: string
    effectiveTo?: string | null
    legalBasis: string
    dvIssue?: string | null
    notesBg?: string | null
    notesRu?: string | null
  }) => Promise<string | null>
  getPendingCount: () => number
}

export const useLegislationStore = create<LegislationState>()(
  persist(
    (set, get) => ({
      alerts: [],
      isLoaded: false,
      isLoading: false,

      loadAlerts: async () => {
        if (!supabase) return
        set({ isLoading: true })
        const { data, error } = await supabase
          .from('legislation_alerts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) {
          console.warn('[legislationStore] loadAlerts failed:', error)
          set({ isLoading: false, isLoaded: true })
          return
        }

        set({
          alerts: (data ?? []) as LegislationAlert[],
          isLoaded: true,
          isLoading: false,
        })
      },

      addManualAlert: async (title, summary_bg, summary_ru, affected_rate_keys) => {
        if (!supabase) return 'Supabase не настроен'
        const { data, error } = await supabase
          .from('legislation_alerts')
          .insert({
            source: 'manual',
            title,
            summary_bg,
            summary_ru,
            affected_rate_keys,
            status: 'pending',
          })
          .select('*')
          .single()

        if (error) return error.message
        if (data) {
          set(state => ({ alerts: [data as LegislationAlert, ...state.alerts] }))
        }
        return null
      },

      updateAlertStatus: async (id, status, review_notes) => {
        if (!supabase) return 'Supabase не настроен'
        const {
          data: { user },
        } = await supabase.auth.getUser()

        const patch: Record<string, unknown> = {
          status,
          reviewed_by: user?.id ?? null,
          reviewed_at: new Date().toISOString(),
        }
        if (review_notes !== undefined) patch.review_notes = review_notes

        const { data, error } = await supabase
          .from('legislation_alerts')
          .update(patch)
          .eq('id', id)
          .select('*')
          .single()

        if (error) return error.message
        if (data) {
          set(state => ({
            alerts: state.alerts.map(a => (a.id === id ? (data as LegislationAlert) : a)),
          }))
        }
        return null
      },

      applyRateChange: async ({
        alertId,
        rateKey,
        newValue,
        effectiveFrom,
        effectiveTo = null,
        legalBasis,
        dvIssue = null,
        notesBg = null,
        notesRu = null,
      }) => {
        if (!supabase) return 'Supabase не настроен'
        const {
          data: { user },
        } = await supabase.auth.getUser()

        const { data: versionRow, error: insertErr } = await supabase
          .from('tax_rate_versions')
          .insert({
            rate_key: rateKey,
            value: newValue,
            effective_from: effectiveFrom,
            effective_to: effectiveTo,
            legal_basis: legalBasis,
            dv_issue: dvIssue,
            notes_bg: notesBg,
            notes_ru: notesRu,
            confirmed_by: user?.id ?? null,
            confirmed_at: new Date().toISOString(),
            is_active: true,
          })
          .select('id')
          .single()

        if (insertErr) return insertErr.message
        const newVersionId = (versionRow as { id: string } | null)?.id
        if (!newVersionId) return 'Не удалось създам нов запис в tax_rate_versions'

        const alert = get().alerts.find(a => a.id === alertId)
        const prevIds = alert?.applied_rate_version_ids ?? []
        const mergedIds = [...prevIds, newVersionId]

        const { data: updatedAlert, error: updErr } = await supabase
          .from('legislation_alerts')
          .update({
            status: 'applied',
            reviewed_by: user?.id ?? null,
            reviewed_at: new Date().toISOString(),
            applied_rate_version_ids: mergedIds,
          })
          .eq('id', alertId)
          .select('*')
          .single()

        if (updErr) return updErr.message

        if (updatedAlert) {
          set(state => ({
            alerts: state.alerts.map(a =>
              a.id === alertId ? (updatedAlert as LegislationAlert) : a,
            ),
          }))
        }

        try {
          const { loadTaxRates } = await import('../lib/taxRates')
          await loadTaxRates()
        } catch (err) {
          console.warn('[legislationStore] reload taxRates cache failed:', err)
        }

        return null
      },

      getPendingCount: () => get().alerts.filter(a => a.status === 'pending').length,
    }),
    {
      name: 'taxbg-legislation',
      partialize: state => ({ alerts: state.alerts, isLoaded: state.isLoaded }),
    },
  ),
)
