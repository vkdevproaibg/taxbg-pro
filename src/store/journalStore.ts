import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CHART_OF_ACCOUNTS } from '../constants/chartOfAccounts'

export interface JournalEntry {
  id: string
  date: string
  description: string
  debitAccount: string
  creditAccount: string
  amount: number
  vatAmount?: number
  counterparty?: string
  invoiceNumber?: string
  linkedTransactionId?: string
  source: 'auto' | 'manual' | 'ai'
  aiSuggested?: boolean
  period: string
  companyId?: string

  // Manual editing support
  isManuallyEdited?: boolean
  originalDebit?:    string   // original account code before first edit
  originalCredit?:   string
  originalAmount?:   number
  editedBy?:         string   // profile id
  editedAt?:         string   // ISO datetime
  editReason?:       string
}

interface JournalState {
  entries: JournalEntry[]
  bankBalance: number
  bankBalanceDate: string
  debtorsBalance: number
  creditorsBalance: number
  capitalAmount: number

  addEntry: (entry: Omit<JournalEntry, 'id'>) => void
  updateEntry: (id: string, patch: Partial<JournalEntry>) => void
  deleteEntry: (id: string) => void
  editEntry: (
    id: string,
    patch: {
      debitAccount?: string
      creditAccount?: string
      amount?: number
      description?: string
      editReason?: string
    },
    editorProfileId: string
  ) => void
  setBankBalance: (amount: number, date: string) => void
  setDebtorsBalance: (amount: number) => void
  setCreditorsBalance: (amount: number) => void
  setCapitalAmount: (amount: number) => void

  getByPeriod: (from: string, to: string, companyId?: string) => JournalEntry[]
  getByAccount: (accountCode: string, from?: string, to?: string, companyId?: string) => JournalEntry[]
  getAccountBalance: (accountCode: string, upToDate?: string, companyId?: string) => number
  clearEntries: () => void
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: [],
      bankBalance: 0,
      bankBalanceDate: '',
      debtorsBalance: 0,
      creditorsBalance: 0,
      capitalAmount: 102,

      addEntry: (entry) =>
        set((s) => ({
          entries: [...s.entries, { ...entry, id: crypto.randomUUID() }],
        })),

      updateEntry: (id, patch) =>
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),

      deleteEntry: (id) =>
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),

      editEntry: (id, patch, editorProfileId) =>
        set((s) => ({
          entries: s.entries.map((e) => {
            if (e.id !== id) return e
            return {
              ...e,
              // Save originals on first edit only
              originalDebit:  e.isManuallyEdited ? e.originalDebit  : e.debitAccount,
              originalCredit: e.isManuallyEdited ? e.originalCredit : e.creditAccount,
              originalAmount: e.isManuallyEdited ? e.originalAmount : e.amount,
              // Apply patch
              ...(patch.debitAccount  !== undefined && { debitAccount:  patch.debitAccount }),
              ...(patch.creditAccount !== undefined && { creditAccount: patch.creditAccount }),
              ...(patch.amount        !== undefined && { amount:        patch.amount }),
              ...(patch.description   !== undefined && { description:   patch.description }),
              // Mark as manually edited
              isManuallyEdited: true,
              editedBy:   editorProfileId,
              editedAt:   new Date().toISOString(),
              editReason: patch.editReason ?? e.editReason,
            }
          }),
        })),
        // TODO: sync to Supabase journal_lines
        // (update is_manually_edited, original_*, edited_by, edited_at)

      setBankBalance: (bankBalance, bankBalanceDate) =>
        set({ bankBalance, bankBalanceDate }),

      setDebtorsBalance: (debtorsBalance) => set({ debtorsBalance }),
      setCreditorsBalance: (creditorsBalance) => set({ creditorsBalance }),
      setCapitalAmount: (capitalAmount) => set({ capitalAmount }),

      getByPeriod: (from, to, companyId?) =>
        get().entries.filter((e) => {
          if (e.date < from || e.date > to) return false
          if (companyId && e.companyId && e.companyId !== companyId) return false
          return true
        }),

      getByAccount: (accountCode, from, to, companyId?) =>
        get().entries.filter((e) => {
          const match = e.debitAccount === accountCode || e.creditAccount === accountCode
          if (!match) return false
          if (from && e.date < from) return false
          if (to && e.date > to) return false
          if (companyId && e.companyId && e.companyId !== companyId) return false
          return true
        }),

      getAccountBalance: (accountCode, upToDate?, companyId?) => {
        const account = CHART_OF_ACCOUNTS.find((a) => a.code === accountCode)
        if (!account) return 0

        const relevant = get().entries.filter((e) => {
          const match = e.debitAccount === accountCode || e.creditAccount === accountCode
          if (!match) return false
          if (upToDate && e.date > upToDate) return false
          if (companyId && e.companyId && e.companyId !== companyId) return false
          return true
        })

        let balance = 0
        for (const entry of relevant) {
          if (entry.debitAccount === accountCode) {
            balance += account.normalBalance === 'debit' ? entry.amount : -entry.amount
          } else {
            balance += account.normalBalance === 'credit' ? entry.amount : -entry.amount
          }
        }
        return balance
      },

      clearEntries: () => set({ entries: [] }),
    }),
    { name: 'taxbg-journal' }
  )
)
