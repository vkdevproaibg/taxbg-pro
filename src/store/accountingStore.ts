import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { transactionToJournalEntry, createVatJournalEntry, createVatInputCreditEntry } from '../lib/journalAI'
import { useJournalStore } from './journalStore'
import type { JournalEntry } from './journalStore'

export type TransactionType =
  | 'income'        // приход без ДДС (B2B услуги, wire transfer)
  | 'expense'       // разход без ДДС
  | 'vat_out'       // продажба с ДДС — фактура с начислен ДДС
  | 'vat_in'        // покупка с ДДС — данъчен кредит
  | 'salary'        // изплатена нетна заплата
  | 'dividend'      // изплатен дивидент
  | 'appstore'      // изплащане от App Store (Apple удържа ДДС и комисия)
  | 'googleplay'    // изплащане от Google Play (Google удържа ДДС и комисия)
  | 'stripe'        // изплащане от Stripe / друг payment processor
  | 'refund'        // върнато плащане / отписка (отрицателна корекция)
  | 'asset_purchase'    // покупка основного средства (автомобиль, оборудование)
  | 'depreciation'      // амортизация основного средства
  | 'vehicle_tax'       // данък МПС — муниципален, платим в общината
  | 'vehicle_expense'   // гориво, застраховка, техобслужване

export interface Transaction {
  id: string
  date: string             // ISO 'YYYY-MM-DD'
  description: string
  amount: number           // EUR, винаги положително
  type: TransactionType
  vatRate?: 0.20 | 0.09 | 0
  vatAmount?: number
  // За appstore / googleplay / stripe
  grossAmount?: number     // брутна сума преди комисия (ако известна)
  platformFee?: number     // комисия на платформата
  // Обща информация
  counterparty?: string
  invoiceNumber?: string
  // За основни средства (автомобил и др.)
  assetName?: string           // 'Toyota Yaris 2023'
  assetValue?: number          // покупна цена
  depreciationRate?: number    // 0.25 = 25% годишно (ЗКПО)
  deductiblePercent?: number   // 0.5 = 50% (смесена употреба) | 1.0 = 100% (само служебен)
  municipality?: string        // за данък МПС — 'София', 'Пловдив', 'Варна' и др.
  // За подписки — период на признаване
  subscriptionPeriodStart?: string  // 'YYYY-MM-DD'
  subscriptionPeriodEnd?: string    // 'YYYY-MM-DD'
  isDeferred?: boolean              // приход за бъдещ период
  companyId?: string
}

interface AccountingState {
  transactions: Transaction[]
  isSynced: boolean

  initFromSupabase: (companyId: string) => Promise<void>
  addTransaction:    (tx: Omit<Transaction, 'id'>) => void
  updateTransaction: (id: string, patch: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void
  backfillJournalEntries: () => void
  // Агрегатори
  getByPeriod: (from: string, to: string, companyId?: string) => Transaction[]
  getTotalIncome: (from: string, to: string) => number
  getTotalExpenses: (from: string, to: string) => number
  getVatCollected: (from: string, to: string) => number
  getVatDeductible: (from: string, to: string) => number
  getVatPayable: (from: string, to: string) => number
  getPlatformIncome: (from: string, to: string) => number
}

export const useAccountingStore = create<AccountingState>()(
  persist(
    (set, get) => ({
      transactions: [],
      isSynced: false,

      initFromSupabase: async (companyId: string) => {
        const {
          fetchTransactions,
          fetchJournalEntries,
          importLocalAccountingData,
        } = await import('../lib/supabaseAccounting')

        // Check if server already has data for this company
        const serverTxs = await fetchTransactions(companyId)

        if (serverTxs.length === 0) {
          // No server data — import from localStorage
          const localTxs = get().transactions.filter(
            (t) => t.companyId === companyId || !t.companyId
          )
          const localEntries = useJournalStore.getState().entries.filter(
            (e) => e.companyId === companyId || !e.companyId
          )

          if (localTxs.length > 0) {
            const { error } = await importLocalAccountingData(
              localTxs,
              localEntries,
              companyId
            )
            if (error) {
              console.error('Accounting import error:', error)
              set({ isSynced: true })
              return
            }
          }

          // Reload from server after import (or if no local data to import)
          const imported = await fetchTransactions(companyId)
          const importedEntries = await fetchJournalEntries(companyId)
          set({ transactions: imported, isSynced: true })
          useJournalStore.setState({ entries: importedEntries })
        } else {
          // Server has data — use it as source of truth
          const entries = await fetchJournalEntries(companyId)
          set({ transactions: serverTxs, isSynced: true })
          useJournalStore.setState({ entries })
        }
      },

      addTransaction: (tx) => {
        const id = crypto.randomUUID()
        const newTx: Transaction = { ...tx, id }

        // Auto-create journal entries — atomic with transaction creation
        const journalState = useJournalStore.getState()
        const alreadyLinked = journalState.entries.some(
          (e) => e.linkedTransactionId === id
        )

        let entry: JournalEntry | null = null
        let vatEntry: JournalEntry | null = null
        let vatInputEntry: JournalEntry | null = null

        if (!alreadyLinked) {
          const rawEntry         = transactionToJournalEntry(newTx)
          const rawVatEntry      = createVatJournalEntry(newTx)
          const rawVatInputEntry = createVatInputCreditEntry(newTx)
          entry         = rawEntry         ? { ...rawEntry,         id: crypto.randomUUID() } : null
          vatEntry      = rawVatEntry      ? { ...rawVatEntry,      id: crypto.randomUUID() } : null
          vatInputEntry = rawVatInputEntry ? { ...rawVatInputEntry, id: crypto.randomUUID() } : null
          useJournalStore.setState({
            entries: [
              ...journalState.entries,
              ...(entry         ? [entry]         : []),
              ...(vatEntry      ? [vatEntry]      : []),
              ...(vatInputEntry ? [vatInputEntry] : []),
            ],
          })
        }

        // Optimistic local update
        set((s) => ({ transactions: [...s.transactions, newTx] }))

        // Sync to Supabase if authenticated
        const companyId = newTx.companyId
        if (companyId && get().isSynced) {
          import('../lib/supabaseAccounting').then(({ createTransaction }) => {
            createTransaction(newTx, entry, vatEntry, companyId, vatInputEntry).then(({ error }) => {
              if (error) console.error('Sync addTransaction error:', error)
            })
          })
        }
      },

      updateTransaction: (id, patch) => {
        // Update local state first
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, ...patch } : t
          ),
        }))

        // Regenerate journal entries for updated transaction
        const updatedTx = get().transactions.find((t) => t.id === id)
        if (updatedTx) {
          const journalState = useJournalStore.getState()
          const filtered = journalState.entries.filter(
            (e) => e.linkedTransactionId !== id
          )
          const rawEntry         = transactionToJournalEntry(updatedTx)
          const rawVatEntry      = createVatJournalEntry(updatedTx)
          const rawVatInputEntry = createVatInputCreditEntry(updatedTx)
          useJournalStore.setState({
            entries: [
              ...filtered,
              ...(rawEntry         ? [{ ...rawEntry,         id: crypto.randomUUID() }] : []),
              ...(rawVatEntry      ? [{ ...rawVatEntry,      id: crypto.randomUUID() }] : []),
              ...(rawVatInputEntry ? [{ ...rawVatInputEntry, id: crypto.randomUUID() }] : []),
            ],
          })

          // Sync transaction fields to Supabase
          if (get().isSynced) {
            import('../lib/supabaseAccounting').then(
              ({ updateTransactionInSupabase }) => {
                updateTransactionInSupabase(id, patch).then(({ error }) => {
                  if (error) console.error('Sync updateTransaction error:', error)
                })
              }
            )
          }
        }
      },

      deleteTransaction: (id) => {
        // Remove linked journal entries from local store
        const journalState = useJournalStore.getState()
        useJournalStore.setState({
          entries: journalState.entries.filter(
            (e) => e.linkedTransactionId !== id
          ),
        })

        // Remove transaction from local store
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
        }))

        // Sync to Supabase (deletes transaction + linked batches + lines)
        if (get().isSynced) {
          import('../lib/supabaseAccounting').then(
            ({ deleteTransactionFromSupabase }) => {
              deleteTransactionFromSupabase(id).then(({ error }) => {
                if (error) console.error('Sync deleteTransaction error:', error)
              })
            }
          )
        }
      },

      backfillJournalEntries: () => {
        const { transactions } = useAccountingStore.getState()
        const journalState = useJournalStore.getState()
        const linkedIds = new Set(
          journalState.entries
            .map((e) => e.linkedTransactionId)
            .filter(Boolean)
        )
        const newEntries: JournalEntry[] = []
        for (const tx of transactions) {
          if (linkedIds.has(tx.id)) continue
          const entry         = transactionToJournalEntry(tx)
          const vatEntry      = createVatJournalEntry(tx)
          const vatInputEntry = createVatInputCreditEntry(tx)
          if (entry)         newEntries.push({ ...entry,         id: crypto.randomUUID() })
          if (vatEntry)      newEntries.push({ ...vatEntry,      id: crypto.randomUUID() })
          if (vatInputEntry) newEntries.push({ ...vatInputEntry, id: crypto.randomUUID() })
        }
        if (newEntries.length > 0) {
          useJournalStore.setState({
            entries: [...journalState.entries, ...newEntries],
          })
          console.log(`[Migration] Backfilled ${newEntries.length} journal entries`)
        }
      },

      getByPeriod: (from, to, companyId?: string) =>
        get().transactions.filter(
          (t) => t.date >= from && t.date <= to && !t.isDeferred &&
          (companyId ? t.companyId === companyId : true)
        ),

      getTotalIncome: (from, to) =>
        get()
          .getByPeriod(from, to)
          .filter((t) =>
            ['income', 'vat_out', 'appstore', 'googleplay', 'stripe'].includes(t.type)
          )
          .reduce((s, t) => s + (t.type === 'refund' ? -t.amount : t.amount), 0),

      getTotalExpenses: (from, to) =>
        get()
          .getByPeriod(from, to)
          .filter((t) =>
            ['expense', 'vat_in', 'salary', 'dividend',
             'depreciation', 'vehicle_tax', 'vehicle_expense'].includes(t.type)
          )
          .reduce((s, t) => {
            if (t.type === 'vehicle_expense') {
              return s + t.amount * (t.deductiblePercent ?? 0.5)
            }
            return s + t.amount
          }, 0),

      getVatCollected: (from, to) =>
        get()
          .getByPeriod(from, to)
          .filter((t) => t.type === 'vat_out')
          .reduce((s, t) => s + (t.vatAmount ?? 0), 0),

      getVatDeductible: (from, to) =>
        get()
          .getByPeriod(from, to)
          .filter((t) => t.type === 'vat_in')
          .reduce((s, t) => s + (t.vatAmount ?? 0), 0),

      getVatPayable: (from, to) =>
        get().getVatCollected(from, to) - get().getVatDeductible(from, to),

      getPlatformIncome: (from, to) =>
        get()
          .getByPeriod(from, to)
          .filter((t) => ['appstore', 'googleplay', 'stripe'].includes(t.type))
          .reduce((s, t) => s + t.amount, 0),
    }),
    { name: 'taxbg-accounting' }
  )
)
