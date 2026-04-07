import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
}

interface AccountingState {
  transactions: Transaction[]
  addTransaction:    (tx: Omit<Transaction, 'id'>) => void
  updateTransaction: (id: string, patch: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void
  // Агрегатори
  getByPeriod: (from: string, to: string) => Transaction[]
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

      addTransaction: (tx) =>
        set((s) => ({
          transactions: [...s.transactions, { ...tx, id: crypto.randomUUID() }],
        })),

      updateTransaction: (id, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, ...patch } : t,
          ),
        })),

      deleteTransaction: (id) =>
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
        })),

      getByPeriod: (from, to) =>
        get().transactions.filter(
          (t) => t.date >= from && t.date <= to && !t.isDeferred
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
            // For vehicle_expense — apply deductible percent
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

      getVatPayable: (from, to) => get().getVatCollected(from, to) - get().getVatDeductible(from, to),

      // Приходи от платформи (App Store + Google Play + Stripe) — за справка
      getPlatformIncome: (from, to) =>
        get()
          .getByPeriod(from, to)
          .filter((t) => ['appstore', 'googleplay', 'stripe'].includes(t.type))
          .reduce((s, t) => s + t.amount, 0),
    }),
    { name: 'taxbg-accounting' }
  )
)
