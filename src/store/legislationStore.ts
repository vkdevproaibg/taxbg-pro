import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import {
  detectRateImpact,
  generateCorrectionBatch,
  type CorrectionDiff,
} from '../lib/correctionEngine'

export type LegislationSource = 'dv' | 'nap' | 'noi' | 'kik-info' | 'manual'
export type LegislationStatus = 'pending' | 'reviewing' | 'applied' | 'dismissed'
export type CorrectionStatus = 'pending' | 'confirmed' | 'dismissed'

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

export interface CorrectionReport {
  id: string
  company_id: string
  trigger_type: 'rate_change' | 'manual' | 'audit_finding'
  trigger_rate_key: string | null
  trigger_alert_id: string | null
  affected_from: string
  affected_to: string
  old_values_json: {
    rateKey: string
    oldValue: number
    newValue: number
  }
  new_values_json: {
    rateKey: string
    oldValue: number
    newValue: number
  }
  difference_json: { diffs: CorrectionDiff[] }
  total_difference: number
  status: CorrectionStatus
  confirmed_by: string | null
  confirmed_at: string | null
  dismiss_reason: string | null
  correction_batch_id: string | null
  created_at: string
}

interface LegislationState {
  alerts: LegislationAlert[]
  corrections: CorrectionReport[]
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

  loadCorrectionReports: (companyId: string) => Promise<void>
  getCorrectionReports: (companyId: string) => CorrectionReport[]
  getPendingCorrectionsCount: (companyId: string) => number
  confirmCorrection: (reportId: string) => Promise<string | null>
  dismissCorrection: (reportId: string, reason: string) => Promise<string | null>
}

async function loadOldRateValue(rateKey: string, asOf: string): Promise<number | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('tax_rate_versions')
    .select('value, effective_from, effective_to')
    .eq('rate_key', rateKey)
    .lte('effective_from', asOf)
    .order('effective_from', { ascending: false })
    .limit(5)

  if (error || !data) return null
  for (const row of data) {
    const from = row.effective_from as string
    const to = row.effective_to as string | null
    if (from <= asOf && (to === null || to >= asOf)) {
      return Number(row.value)
    }
  }
  return null
}

export const useLegislationStore = create<LegislationState>()(
  persist(
    (set, get) => ({
      alerts: [],
      corrections: [],
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

        // Resolve the old value BEFORE inserting the new version,
        // so the "previous rate" lookup isn't shadowed.
        const oldValue = await loadOldRateValue(rateKey, effectiveFrom)

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

        // ── Retroactive detection ────────────────────────────
        // If the new rate takes effect before the current month
        // we scan the active company's existing data and record
        // a correction_reports row for each detected impact.
        const currentMonth = new Date().toISOString().slice(0, 7) + '-01'
        if (oldValue !== null && effectiveFrom < currentMonth) {
          try {
            const { useCompaniesStore } = await import('./companiesStore')
            const { useAccountingStore } = await import('./accountingStore')
            const { useEmployeesStore } = await import('./employeesStore')

            const companies = useCompaniesStore.getState().companies
            const transactions = useAccountingStore.getState().transactions
            const employees = useEmployeesStore.getState().employees

            for (const company of companies) {
              const companyTx = transactions.filter(
                t => !t.companyId || t.companyId === company.id,
              )
              const companyEmps = employees.filter(
                e => !e.companyId || e.companyId === company.id,
              )

              const diffs = detectRateImpact({
                rateKey,
                oldValue,
                newValue,
                effectiveFrom,
                effectiveTo,
                companyId: company.id,
                transactions: companyTx,
                employees: companyEmps,
              })

              if (diffs.length === 0) continue

              const totalDiff = diffs.reduce((s, d) => s + d.difference, 0)

              const { data: reportRow, error: repErr } = await supabase
                .from('correction_reports')
                .insert({
                  company_id: company.id,
                  trigger_type: 'rate_change',
                  trigger_rate_key: rateKey,
                  trigger_alert_id: alertId,
                  affected_from: effectiveFrom,
                  affected_to:
                    effectiveTo ??
                    new Date().toISOString().slice(0, 10),
                  old_values_json: { rateKey, oldValue, newValue },
                  new_values_json: { rateKey, oldValue, newValue },
                  difference_json: { diffs },
                  total_difference: Math.round(totalDiff * 100) / 100,
                  status: 'pending',
                })
                .select('*')
                .single()

              if (repErr) {
                console.warn('[legislationStore] create correction_report failed:', repErr)
                continue
              }
              if (reportRow) {
                set(state => ({
                  corrections: [reportRow as CorrectionReport, ...state.corrections],
                }))
              }
            }
          } catch (err) {
            console.warn('[legislationStore] retroactive detection failed:', err)
          }
        }

        return null
      },

      getPendingCount: () => get().alerts.filter(a => a.status === 'pending').length,

      loadCorrectionReports: async (companyId: string) => {
        if (!supabase) return
        const { data, error } = await supabase
          .from('correction_reports')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) {
          console.warn('[legislationStore] loadCorrectionReports failed:', error)
          return
        }

        const fetched = (data ?? []) as CorrectionReport[]
        set(state => {
          // Merge: replace any existing rows for this company with fetched.
          const others = state.corrections.filter(c => c.company_id !== companyId)
          return { corrections: [...fetched, ...others] }
        })
      },

      getCorrectionReports: (companyId: string) =>
        get().corrections.filter(c => c.company_id === companyId),

      getPendingCorrectionsCount: (companyId: string) =>
        get().corrections.filter(c => c.company_id === companyId && c.status === 'pending')
          .length,

      confirmCorrection: async (reportId: string) => {
        if (!supabase) return 'Supabase не настроен'

        const report = get().corrections.find(c => c.id === reportId)
        if (!report) return 'Доклад за корекция не е намерен'
        if (report.status !== 'pending') return 'Вече обработено'

        const diffs = report.difference_json?.diffs ?? []
        if (diffs.length === 0) return 'Няма разлики за приложение'

        const reason =
          `Корекция ${report.trigger_rate_key ?? ''} ` +
          `(${report.affected_from} .. ${report.affected_to}) — ` +
          `промяна на ставка от ${report.old_values_json.oldValue} ` +
          `на ${report.new_values_json.newValue}`

        const { batch, lines } = generateCorrectionBatch(
          diffs,
          report.company_id,
          reason,
        )

        if (lines.length === 0) {
          // Nothing to post (e.g. warning-only diffs) — just mark confirmed.
          const {
            data: { user },
          } = await supabase.auth.getUser()

          const { data: updated, error } = await supabase
            .from('correction_reports')
            .update({
              status: 'confirmed',
              confirmed_by: user?.id ?? null,
              confirmed_at: new Date().toISOString(),
            })
            .eq('id', reportId)
            .select('*')
            .single()

          if (error) return error.message
          if (updated) {
            set(state => ({
              corrections: state.corrections.map(c =>
                c.id === reportId ? (updated as CorrectionReport) : c,
              ),
            }))
          }
          return null
        }

        const {
          data: { user },
        } = await supabase.auth.getUser()

        const { data: batchRow, error: batchErr } = await supabase
          .from('journal_batches')
          .insert({ ...batch, created_by: user?.id ?? null })
          .select('id')
          .single()

        if (batchErr) return batchErr.message
        const batchId = (batchRow as { id: string } | null)?.id
        if (!batchId) return 'Не успя да се създаде batch'

        const linesWithBatchId = lines.map(l => ({ ...l, batch_id: batchId }))
        const { error: linesErr } = await supabase
          .from('journal_lines')
          .insert(linesWithBatchId)

        if (linesErr) return linesErr.message

        const { data: updated, error: updErr } = await supabase
          .from('correction_reports')
          .update({
            status: 'confirmed',
            confirmed_by: user?.id ?? null,
            confirmed_at: new Date().toISOString(),
            correction_batch_id: batchId,
          })
          .eq('id', reportId)
          .select('*')
          .single()

        if (updErr) return updErr.message

        if (updated) {
          set(state => ({
            corrections: state.corrections.map(c =>
              c.id === reportId ? (updated as CorrectionReport) : c,
            ),
          }))
        }

        return null
      },

      dismissCorrection: async (reportId: string, reason: string) => {
        if (!supabase) return 'Supabase не настроен'
        const {
          data: { user },
        } = await supabase.auth.getUser()

        const { data, error } = await supabase
          .from('correction_reports')
          .update({
            status: 'dismissed',
            confirmed_by: user?.id ?? null,
            confirmed_at: new Date().toISOString(),
            dismiss_reason: reason,
          })
          .eq('id', reportId)
          .select('*')
          .single()

        if (error) return error.message
        if (data) {
          set(state => ({
            corrections: state.corrections.map(c =>
              c.id === reportId ? (data as CorrectionReport) : c,
            ),
          }))
        }
        return null
      },
    }),
    {
      name: 'taxbg-legislation',
      partialize: state => ({
        alerts: state.alerts,
        corrections: state.corrections,
        isLoaded: state.isLoaded,
      }),
    },
  ),
)
