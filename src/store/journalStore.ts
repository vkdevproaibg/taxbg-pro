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
  setBankBalance: (amount: number, date: string) => void
  setDebtorsBalance: (amount: number) => void
  setCreditorsBalance: (amount: number) => void
  setCapitalAmount: (amount: number) => void

  getByPeriod: (from: string, to: string) => JournalEntry[]
  getByAccount: (accountCode: string, from?: string, to?: string) => JournalEntry[]
  getAccountBalance: (accountCode: string, upToDate?: string) => number
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

      setBankBalance: (bankBalance, bankBalanceDate) =>
        set({ bankBalance, bankBalanceDate }),

      setDebtorsBalance: (debtorsBalance) => set({ debtorsBalance }),
      setCreditorsBalance: (creditorsBalance) => set({ creditorsBalance }),
      setCapitalAmount: (capitalAmount) => set({ capitalAmount }),

      getByPeriod: (from, to) =>
        get().entries.filter((e) => e.date >= from && e.date <= to),

      getByAccount: (accountCode, from, to) =>
        get().entries.filter((e) => {
          const match = e.debitAccount === accountCode || e.creditAccount === accountCode
          if (!match) return false
          if (from && e.date < from) return false
          if (to && e.date > to) return false
          return true
        }),

      getAccountBalance: (accountCode, upToDate) => {
        const account = CHART_OF_ACCOUNTS.find((a) => a.code === accountCode)
        if (!account) return 0

        const relevant = get().entries.filter((e) => {
          const match = e.debitAccount === accountCode || e.creditAccount === accountCode
          if (!match) return false
          if (upToDate && e.date > upToDate) return false
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
    }),
    { name: 'taxbg-journal' }
  )
)
