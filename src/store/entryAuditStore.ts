import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

export type EntryPath = 'new' | 'existing' | 'closing'
export type AuditIssueLevel = 'critical' | 'important' | 'attention' | 'ok'

export interface AuditAction {
  order: number
  title: string
  description: string
  link?: string
  deadline?: string
  downloadType?: 'dds_xml' | 'obrazec1_csv' | 'zkpo_xml'
}

export interface AuditIssue {
  id: string
  level: AuditIssueLevel
  title: string
  description: string
  penaltyMin?: number
  penaltyMax?: number
  legalBasis: string
  daysOverdue?: number
  actions: AuditAction[]
}

interface EntryAuditState {
  path: EntryPath | null
  diagnosticAnswers: Record<string, string>
  issues: AuditIssue[]
  resolvedIssues: string[]
  auditCompleted: boolean
  auditSkipped: boolean
  entryDate: string

  setPath:         (path: EntryPath) => void
  setAnswer:       (id: string, value: string) => void
  setIssues:       (issues: AuditIssue[]) => void
  resolveIssue:    (id: string) => void
  completeAudit:   () => void
  skipAudit:       () => void
  resetAudit:      () => void
  setEntryDate:    (date: string) => void

  logToSupabase:         () => Promise<void>
  getUnresolvedCritical: () => AuditIssue[]
  getUnresolvedAll:      () => AuditIssue[]
}

export const useEntryAuditStore = create<EntryAuditState>()(
  persist(
    (set, get) => ({
      path:              null,
      diagnosticAnswers: {},
      issues:            [],
      resolvedIssues:    [],
      auditCompleted:    false,
      auditSkipped:      false,
      entryDate:         new Date().toISOString().slice(0, 10),

      setPath:     (path)      => set({ path }),
      setAnswer:   (id, value) =>
        set((s) => ({ diagnosticAnswers: { ...s.diagnosticAnswers, [id]: value } })),
      setIssues:   (issues)    => set({ issues }),
      resolveIssue: (id)       =>
        set((s) => ({
          resolvedIssues: s.resolvedIssues.includes(id)
            ? s.resolvedIssues
            : [...s.resolvedIssues, id],
        })),
      completeAudit: () => {
        set({ auditCompleted: true })
        get().logToSupabase()
      },

      skipAudit: () => {
        set({ auditSkipped: true })
        get().logToSupabase()
      },

      logToSupabase: async () => {
        if (!supabase) return
        const { path, issues, resolvedIssues, auditCompleted, entryDate } = get()

        const { useAuthStore }      = await import('./authStore')
        const { useCompaniesStore } = await import('./companiesStore')
        const auth      = useAuthStore.getState()
        const companies = useCompaniesStore.getState()

        if (!auth.user) return

        await supabase.from('audit_events').insert({
          actor_profile_id:  auth.user.id,
          client_account_id: companies.clientAccountId,
          company_id:        companies.activeCompanyId,
          entity_type:       'entry_audit',
          entity_id:         null,
          action:            auditCompleted ? 'audit_completed' : 'audit_skipped',
          after_json: {
            path,
            entry_date:      entryDate,
            total_issues:    issues.length,
            resolved_issues: resolvedIssues.length,
            critical_issues: issues.filter(i => i.level === 'critical').length,
            issues_summary:  issues.map(i => ({
              id:       i.id,
              level:    i.level,
              title:    i.title,
              resolved: resolvedIssues.includes(i.id),
            })),
          },
          request_id: crypto.randomUUID(),
        })
      },
      resetAudit:    () => set({
        diagnosticAnswers: {}, issues: [],
        resolvedIssues: [], auditCompleted: false,
        auditSkipped: false,
      }),
      setEntryDate: (date) => set({ entryDate: date }),

      getUnresolvedCritical: () => {
        const { issues, resolvedIssues } = get()
        return issues.filter(
          i => i.level === 'critical' && !resolvedIssues.includes(i.id)
        )
      },
      getUnresolvedAll: () => {
        const { issues, resolvedIssues } = get()
        return issues.filter(i => !resolvedIssues.includes(i.id))
      },
    }),
    { name: 'taxbg-entry-audit' }
  )
)
