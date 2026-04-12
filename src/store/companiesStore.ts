import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LegalForm } from './userStore'

export interface Company {
  id: string
  name: string
  eik: string
  legalForm: LegalForm
  hasVat: boolean
  hasEmployees: boolean
  country: string          // 'BG' | 'CY' | 'EE' | 'AE' | 'DE' etc.
  currency: string         // 'EUR' | 'USD' | 'GBP' etc.
  taxResidency: string     // 'BG' | 'CY' etc. — where taxes are paid
  isOffshore: boolean      // flagged as offshore/holding
  notes: string            // free text notes about the company
  createdAt: string
  color: string            // UI color for identification '#00966E' etc.
}

export interface CompaniesState {
  companies: Company[]
  activeCompanyId: string | null
  migrated: boolean        // migration from userStore done

  // Supabase state
  clientAccountId: string | null
  isSynced: boolean  // true after first Supabase load

  addCompany:    (c: Omit<Company, 'id' | 'createdAt'>) => string
  updateCompany: (id: string, patch: Partial<Company>) => void
  removeCompany: (id: string) => void
  setActive:     (id: string) => void
  getActive:     () => Company | null
  setMigrated:   () => void

  // New Supabase-aware actions
  initFromSupabase: (profileId: string) => Promise<void>
}

const COMPANY_COLORS = [
  '#00966E', '#D62612', '#3b82f6', '#8b5cf6',
  '#f59e0b', '#10b981', '#ef4444', '#6366f1',
]

export const useCompaniesStore = create<CompaniesState>()(
  persist(
    (set, get) => ({
      companies: [],
      activeCompanyId: null,
      migrated: false,
      clientAccountId: null,
      isSynced: false,

      addCompany: (c) => {
        const id = crypto.randomUUID()
        const colorIndex = get().companies.length % COMPANY_COLORS.length
        const newCompany: Company = {
          ...c,
          id,
          color: c.color || COMPANY_COLORS[colorIndex],
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ companies: [...s.companies, newCompany] }))

        // Sync to Supabase if authenticated
        const { clientAccountId } = get()
        if (clientAccountId) {
          import('../lib/supabaseCompanies').then(({ createCompany }) => {
            createCompany(newCompany, clientAccountId).then(({ error }) => {
              if (error) console.error('Failed to sync company:', error)
            })
          })
        }

        return id
      },

      updateCompany: (id, patch) => {
        set((s) => ({
          companies: s.companies.map((c) =>
            c.id === id ? { ...c, ...patch } : c
          ),
        }))

        // Sync to Supabase
        const { clientAccountId } = get()
        if (clientAccountId) {
          import('../lib/supabaseCompanies').then(({ updateCompany }) => {
            updateCompany(id, patch, clientAccountId)
          })
        }
      },

      removeCompany: (id) => {
        set((s) => ({
          companies: s.companies.filter((c) => c.id !== id),
          activeCompanyId: s.activeCompanyId === id
            ? (s.companies.find(c => c.id !== id)?.id ?? null)
            : s.activeCompanyId,
        }))

        // Soft delete in Supabase
        const { clientAccountId } = get()
        if (clientAccountId) {
          import('../lib/supabaseCompanies').then(({ deleteCompany }) => {
            deleteCompany(id)
          })
        }
      },

      setActive: (id) => {
        set({ activeCompanyId: id })

        import('../lib/analytics').then(({ trackEvent }) => {
          trackEvent('company_switched')
        })

        // Synchronously clear all company-scoped state BEFORE loading new data
        // so the UI never shows data from the previous company
        Promise.all([
          import('./accountingStore').then(({ useAccountingStore }) => {
            useAccountingStore.setState({ transactions: [], isSynced: false })
          }),
          import('./journalStore').then(({ useJournalStore }) => {
            useJournalStore.setState({ entries: [] })
          }),
          import('./employeesStore').then(({ useEmployeesStore }) => {
            useEmployeesStore.setState({ employees: [], isSynced: false })
          }),
        ]).then(() => {
          // After clearing, reload data for the newly selected company
          return Promise.all([
            import('./accountingStore').then(({ useAccountingStore }) =>
              useAccountingStore.getState().initFromSupabase(id).catch((err) => {
                console.error('[setActive] accountingStore load failed:', err)
              })
            ),
            import('./employeesStore').then(({ useEmployeesStore }) =>
              useEmployeesStore.getState().initFromSupabase(id).catch((err) => {
                console.error('[setActive] employeesStore load failed:', err)
              })
            ),
          ])
        })
      },

      getActive: () => {
        const { companies, activeCompanyId } = get()
        return companies.find((c) => c.id === activeCompanyId) ?? null
      },

      setMigrated: () => set({ migrated: true }),

      initFromSupabase: async (profileId: string) => {
        const {
          ensureClientAccount,
          getClientAccountId,
          fetchCompanies,
          importLocalCompanies,
          markMigrationComplete,
        } = await import('../lib/supabaseCompanies')

        // Find or create client account
        const accountInfo = await getClientAccountId(profileId)
        let clientAccountId: string | null = null

        if (!accountInfo) {
          // First login — create client account
          clientAccountId = await ensureClientAccount(profileId)
        } else {
          clientAccountId = accountInfo.id
        }

        if (!clientAccountId) return

        set({ clientAccountId })

        // Check if localStorage migration is needed
        const migrationDone = accountInfo?.migrationDone ?? false

        if (!migrationDone) {
          // Import existing localStorage companies to Supabase
          const localCompanies = get().companies
          if (localCompanies.length > 0) {
            const { error } = await importLocalCompanies(
              localCompanies,
              clientAccountId
            )
            if (!error) {
              await markMigrationComplete(clientAccountId)
            }
          } else {
            // No local companies — just mark as done
            await markMigrationComplete(clientAccountId)
          }
        }

        // Load companies from Supabase
        const serverCompanies = await fetchCompanies(clientAccountId)

        if (serverCompanies.length > 0) {
          const { activeCompanyId } = get()
          const validActive = serverCompanies.find(
            c => c.id === activeCompanyId
          )
          const activeId = validActive
            ? activeCompanyId!
            : serverCompanies[0].id
          set({
            companies: serverCompanies,
            activeCompanyId: activeId,
            isSynced: true,
          })

          // Init accounting + journal for the active company
          const { useAccountingStore } = await import('./accountingStore')
          await useAccountingStore.getState().initFromSupabase(activeId)

          // Init employees for the active company
          const { useEmployeesStore } = await import('./employeesStore')
          await useEmployeesStore.getState().initFromSupabase(activeId)

          // Init group relations for the client account
          const { useGroupStore } = await import('./groupStore')
          await useGroupStore.getState().initFromSupabase(clientAccountId)
        } else {
          set({ isSynced: true })
        }
      },
    }),
    { name: 'taxbg-companies' }
  )
)
