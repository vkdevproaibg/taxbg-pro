import type { Transaction } from '../../store/accountingStore'
import type { Employee } from '../../store/employeesStore'

export interface TestScenario {
  id: string
  name: string
  description: string
  durationLabel: string
  icon: string
  company: {
    name: string
    eik: string
    legalForm: 'ood'
    hasVat: boolean
    hasEmployees: boolean
  }
  employees: Omit<Employee, 'id'>[]
  transactions: Omit<Transaction, 'id'>[]
  expectedResults: {
    transactionCount: number
    totalIncome: number
    totalExpenses: number
    monthlyDDS: number
    annualKNP: number
    balanceShouldMatch: boolean
  }
}

// Helper to generate monthly transactions
function monthlyTransactions(
  year: number,
  months: number[]
): Omit<Transaction, 'id'>[] {
  const txs: Omit<Transaction, 'id'>[] = []

  for (const month of months) {
    const m       = String(month).padStart(2, '0')
    const lastDay = new Date(year, month, 0).getDate()

    // App Store income
    txs.push({
      date: `${year}-${m}-05`,
      type: 'appstore',
      description: 'App Store monthly payout',
      amount: 3200 + Math.floor(Math.random() * 800),
      vatRate: 0, vatAmount: 0,
      counterparty: 'Apple Inc.',
      invoiceNumber: `AS-${year}-${m}`,
    })

    // Stripe income
    txs.push({
      date: `${year}-${m}-10`,
      type: 'stripe',
      description: 'Stripe SaaS subscriptions',
      amount: 4500 + Math.floor(Math.random() * 1000),
      vatRate: 0, vatAmount: 0,
      counterparty: 'Stripe Inc.',
      invoiceNumber: `ST-${year}-${m}`,
    })

    // B2B client
    txs.push({
      date: `${year}-${m}-15`,
      type: 'income',
      description: 'B2B consulting payment',
      amount: 5000,
      vatRate: 0, vatAmount: 0,
      counterparty: 'Client Corp GmbH',
      invoiceNumber: `INV-${year}-${m}-001`,
    })

    // Refund (every 3 months)
    if (month % 3 === 0) {
      txs.push({
        date: `${year}-${m}-20`,
        type: 'refund',
        description: 'App Store refund',
        amount: 150,
        vatRate: 0, vatAmount: 0,
        counterparty: 'Apple Inc.',
        invoiceNumber: `REF-${year}-${m}`,
      })
    }

    // AWS hosting
    txs.push({
      date: `${year}-${m}-03`,
      type: 'expense',
      description: 'AWS hosting',
      amount: 320,
      vatRate: 0, vatAmount: 0,
      counterparty: 'Amazon AWS',
      invoiceNumber: `AWS-${year}-${m}`,
    })

    // GitHub + Figma subscriptions
    txs.push({
      date: `${year}-${m}-01`,
      type: 'expense',
      description: 'GitHub + Figma subscriptions',
      amount: 85,
      vatRate: 0, vatAmount: 0,
      counterparty: 'GitHub / Figma',
      invoiceNumber: `SUBS-${year}-${m}`,
    })

    // Director salary
    txs.push({
      date: `${year}-${m}-${String(lastDay).padStart(2, '0')}`,
      type: 'salary',
      description: 'Director salary',
      amount: 3000,
      vatRate: 0, vatAmount: 0,
      counterparty: 'Director',
      invoiceNumber: `SAL-DIR-${year}-${m}`,
    })

    // Employee salaries
    txs.push({
      date: `${year}-${m}-${String(lastDay).padStart(2, '0')}`,
      type: 'salary',
      description: 'Developer salary',
      amount: 2000,
      vatRate: 0, vatAmount: 0,
      counterparty: 'Employee 1',
      invoiceNumber: `SAL-EMP1-${year}-${m}`,
    })

    // External contractor (Germany)
    txs.push({
      date: `${year}-${m}-20`,
      type: 'expense',
      description: 'External contractor DE',
      amount: 1500,
      vatRate: 0, vatAmount: 0,
      counterparty: 'Contractor GmbH',
      invoiceNumber: `CONT-${year}-${m}`,
    })

    // Office rent (quarterly)
    if (month % 3 === 1) {
      txs.push({
        date: `${year}-${m}-01`,
        type: 'expense',
        description: 'Office rent Q payment',
        amount: 900,
        vatRate: 0, vatAmount: 0,
        counterparty: 'Landlord BG OOD',
        invoiceNumber: `RENT-${year}-Q${Math.ceil(month / 3)}`,
      })
    }
  }

  return txs
}

const YEAR     = new Date().getFullYear()
const MONTHS_1 = [new Date().getMonth() + 1]
const MONTHS_3 = Array.from({ length: 3 }, (_, i) => {
  const m = new Date().getMonth() + 1 - 2 + i
  return m <= 0 ? m + 12 : m
})
const MONTHS_12 = Array.from({ length: 12 }, (_, i) => i + 1)

export const TEST_SCENARIOS: TestScenario[] = [
  {
    id: 'month',
    name: 'Типовой месяц',
    description: 'SaaS компания: App Store + Stripe + B2B клиент, зарплаты, расходы',
    durationLabel: '1 месяц',
    icon: '📅',
    company: {
      name: 'TEST OOD ЕООД',
      eik: '999000001',
      legalForm: 'ood',
      hasVat: true,
      hasEmployees: true,
    },
    employees: [
      {
        name: 'Иван Директоров',
        position: 'Директор',
        egn: '8001011234',
        grossSalary: 3000,
        active: true,
        startDate: `${YEAR}-01-01`,
      },
      {
        name: 'Петр Разработчиков',
        position: 'Senior Developer',
        egn: '9001011234',
        grossSalary: 2000,
        active: true,
        startDate: `${YEAR}-01-01`,
      },
    ],
    transactions: [
      ...monthlyTransactions(YEAR, MONTHS_1),
      // MacBook purchase
      {
        date: `${YEAR}-${String(MONTHS_1[0]).padStart(2, '0')}-02`,
        type: 'asset_purchase',
        description: 'MacBook Pro 14"',
        amount: 2500,
        vatRate: 0, vatAmount: 0,
        counterparty: 'Apple Store',
        invoiceNumber: 'ASSET-001',
        assetName: 'MacBook Pro 14"',
      },
    ],
    expectedResults: {
      transactionCount: 9,
      totalIncome: 12700,
      totalExpenses: 7805,
      monthlyDDS: 0,
      annualKNP: 488,
      balanceShouldMatch: true,
    },
  },

  {
    id: 'quarter',
    name: 'Квартал',
    description: '3 месяца операций + авансова вноска КНП',
    durationLabel: '3 месяца',
    icon: '📊',
    company: {
      name: 'TEST OOD ЕООД',
      eik: '999000002',
      legalForm: 'ood',
      hasVat: true,
      hasEmployees: true,
    },
    employees: [
      {
        name: 'Иван Директоров',
        position: 'Директор',
        egn: '8001011234',
        grossSalary: 3000,
        active: true,
        startDate: `${YEAR}-01-01`,
      },
      {
        name: 'Петр Разработчиков',
        position: 'Senior Developer',
        egn: '9001011234',
        grossSalary: 2000,
        active: true,
        startDate: `${YEAR}-01-01`,
      },
      {
        name: 'Maria Schmidt',
        position: 'External Designer (DE)',
        egn: 'DE-EXTERNAL-001',
        grossSalary: 1500,
        active: true,
        startDate: `${YEAR}-01-01`,
      },
    ],
    transactions: monthlyTransactions(YEAR, MONTHS_3),
    expectedResults: {
      transactionCount: 33,
      totalIncome: 38100,
      totalExpenses: 23415,
      monthlyDDS: 0,
      annualKNP: 1469,
      balanceShouldMatch: true,
    },
  },

  {
    id: 'year',
    name: 'Полный год',
    description: 'Весь годовой цикл: 12 месяцев, ЗКПО, НСИ, ГФО',
    durationLabel: '12 месяцев',
    icon: '📆',
    company: {
      name: 'TEST OOD ЕООД',
      eik: '999000003',
      legalForm: 'ood',
      hasVat: true,
      hasEmployees: true,
    },
    employees: [
      {
        name: 'Иван Директоров',
        position: 'Директор',
        egn: '8001011234',
        grossSalary: 3000,
        active: true,
        startDate: `${YEAR}-01-01`,
      },
      {
        name: 'Петр Разработчиков',
        position: 'Senior Developer',
        egn: '9001011234',
        grossSalary: 2000,
        active: true,
        startDate: `${YEAR}-01-01`,
      },
      {
        name: 'Maria Schmidt',
        position: 'External Designer (DE)',
        egn: 'DE-EXTERNAL-001',
        grossSalary: 1500,
        active: true,
        startDate: `${YEAR}-01-01`,
      },
    ],
    transactions: [
      ...monthlyTransactions(YEAR, MONTHS_12),
      // Company car
      {
        date: `${YEAR}-03-01`,
        type: 'asset_purchase',
        description: 'Toyota Corolla ООД',
        amount: 25000,
        vatRate: 0, vatAmount: 0,
        counterparty: 'Toyota BG',
        invoiceNumber: 'ASSET-CAR-001',
        assetName: 'Toyota Corolla 2024',
      },
      // Annual depreciation car
      {
        date: `${YEAR}-12-31`,
        type: 'depreciation',
        description: 'Амортизация Toyota Corolla 25%',
        amount: 6250,
        vatRate: 0, vatAmount: 0,
        assetName: 'Toyota Corolla 2024',
        deductiblePercent: 0.5,
      },
      // Annual depreciation computers
      {
        date: `${YEAR}-12-31`,
        type: 'depreciation',
        description: 'Амортизация MacBook Pro 50%',
        amount: 1250,
        vatRate: 0, vatAmount: 0,
        assetName: 'MacBook Pro 14"',
        deductiblePercent: 1,
      },
      // Dividends Q4
      {
        date: `${YEAR}-12-15`,
        type: 'dividend',
        description: 'Дивиденти собственик',
        amount: 20000,
        vatRate: 0, vatAmount: 0,
        counterparty: 'Собственик',
        invoiceNumber: 'DIV-001',
      },
    ],
    expectedResults: {
      transactionCount: 148,
      totalIncome: 153600,
      totalExpenses: 92220,
      monthlyDDS: 0,
      annualKNP: 6138,
      balanceShouldMatch: true,
    },
  },
]
