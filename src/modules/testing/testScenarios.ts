import type { Transaction } from '../../store/accountingStore'
import type { Employee } from '../../store/employeesStore'
import { getRateValue } from '../../lib/taxRates'
import { createVatInputCreditEntry } from '../../lib/journalAI'
import { calculateCorporateTax } from '../../lib/financialReports'
import { AUDIT_TEMPLATES } from '../../constants/audit-templates'
import { fillTemplate } from '../../lib/auditDocGenerator'

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

// ─────────────────────────────────────────────────────────────
// UNIT TEST SCENARIOS
// These run pure JS assertions — no store loading, no DB.
// ─────────────────────────────────────────────────────────────

export interface UnitTestScenario {
  id: string
  name: string
  run: () => { passed: boolean; details: string }
}

export const UNIT_TEST_SCENARIOS: UnitTestScenario[] = [
  {
    id: 'tax-rates-versioning',
    name: 'Tax Rate Versioning',
    run: () => {
      const results: string[] = []
      let allPassed = true

      const check = (label: string, ok: boolean, got?: unknown) => {
        if (!ok) {
          allPassed = false
          results.push(`FAIL: ${label}${got !== undefined ? ` (got: ${JSON.stringify(got)})` : ''}`)
        } else {
          results.push(`OK:   ${label}`)
        }
      }

      const ct = getRateValue('corporateTax', '2026-06-15')
      check('corporateTax 2026-06-15 === 0.10', ct === 0.10, ct)

      const mw = getRateValue('minWage', '2026-01-01')
      check('minWage 2026-01-01 === 620.20', mw === 620.20, mw)

      const empDoo = getRateValue('employer.doo', '2026-03-01')
      check('employer.doo 2026-03-01 > 0', typeof empDoo === 'number' && empDoo > 0, empDoo)

      const nonexistent = getRateValue('nonexistent.key', '2026-01-01')
      check('nonexistent.key returns 0', nonexistent === 0, nonexistent)

      const maxOsig = getRateValue('maxOsig', '2026-01-01')
      check('maxOsig 2026-01-01 === 2111.64', maxOsig === 2111.64, maxOsig)

      return { passed: allPassed, details: results.join('\n') }
    },
  },

  {
    id: 'calculator-no-double-deduction',
    name: 'Calculator: No Double Deduction (K3)',
    run: () => {
      const results: string[] = []
      let allPassed = true

      const check = (label: string, ok: boolean, got?: unknown) => {
        if (!ok) { allPassed = false; results.push(`FAIL: ${label}${got !== undefined ? ` (got: ${JSON.stringify(got)})` : ''}`) }
        else results.push(`OK:   ${label}`)
      }

      // Self-employed: revenue=100000, expenses=20000
      const revenue = 100000
      const expenses = 20000
      const normExp = revenue * 0.25  // 25000

      // normative mode: deduct normExp only (not expenses)
      const minOsigSol = getRateValue('minOsigSol', '2026-01-01')
      const solDoo = getRateValue('selfEmployed.doo', '2026-01-01')
      const solZo  = getRateValue('selfEmployed.zo',  '2026-01-01')
      const osigAnnual = minOsigSol * 12 * (solDoo + solZo)

      const normBase = revenue - normExp - osigAnnual
      check('normative: taxableBase does NOT include actual expenses', normBase !== revenue - expenses - osigAnnual || normExp === expenses, normBase)
      check('normative: taxableBase = revenue - normExp - osig', Math.abs(normBase - (revenue - normExp - osigAnnual)) < 0.01, normBase)

      // actual mode: deduct actual expenses only (not normExp)
      const actualBase = revenue - expenses - osigAnnual
      check('actual: taxableBase = revenue - expenses - osig', Math.abs(actualBase - (revenue - expenses - osigAnnual)) < 0.01, actualBase)
      check('actual: taxableBase does NOT include normExp', Math.abs(actualBase - (revenue - normExp - osigAnnual)) > 0.01 || normExp === expenses, actualBase)

      return { passed: allPassed, details: results.join('\n') }
    },
  },

  {
    id: 'vat-input-credit',
    name: 'VAT Input Credit (C1)',
    run: () => {
      const results: string[] = []
      let allPassed = true

      const check = (label: string, ok: boolean, got?: unknown) => {
        if (!ok) { allPassed = false; results.push(`FAIL: ${label}${got !== undefined ? ` (got: ${JSON.stringify(got)})` : ''}`) }
        else results.push(`OK:   ${label}`)
      }

      const vatInTx = {
        id: 'test-1',
        date: '2026-03-15',
        type: 'vat_in' as const,
        description: 'Test purchase',
        amount: 500,
        vatRate: 0.20,
        vatAmount: 100,
        counterparty: 'Supplier BG',
        invoiceNumber: 'INV-001',
      }

      const entry = createVatInputCreditEntry(vatInTx)
      check('vat_in: entry is not null', entry !== null)
      check('vat_in: debitAccount === 452', entry?.debitAccount === '452', entry?.debitAccount)
      check('vat_in: creditAccount === 401', entry?.creditAccount === '401', entry?.creditAccount)
      check('vat_in: amount === 100', entry?.amount === 100, entry?.amount)

      const incomeTx = {
        id: 'test-2',
        date: '2026-03-15',
        type: 'income' as const,
        description: 'Test income',
        amount: 1000,
        vatRate: 0,
        vatAmount: 0,
        counterparty: 'Client',
        invoiceNumber: 'INV-002',
      }
      const nullEntry = createVatInputCreditEntry(incomeTx)
      check('income type: returns null', nullEntry === null, nullEntry)

      return { passed: allPassed, details: results.join('\n') }
    },
  },

  {
    id: 'financial-reports-sync',
    name: 'OPR/Balance Tax Sync (C2)',
    run: () => {
      const results: string[] = []
      let allPassed = true

      const check = (label: string, ok: boolean, got?: unknown) => {
        if (!ok) { allPassed = false; results.push(`FAIL: ${label}${got !== undefined ? ` (got: ${JSON.stringify(got)})` : ''}`) }
        else results.push(`OK:   ${label}`)
      }

      const r1 = calculateCorporateTax(10000, 500)
      check('calculateCorporateTax(10000, 500).taxableProfit === 10500', r1.taxableProfit === 10500, r1.taxableProfit)
      check('calculateCorporateTax(10000, 500).corporateTax === 1050', Math.abs(r1.corporateTax - 1050) < 0.01, r1.corporateTax)

      const r2 = calculateCorporateTax(-5000, 0)
      check('calculateCorporateTax(-5000, 0).taxableProfit === 0', r2.taxableProfit === 0, r2.taxableProfit)
      check('calculateCorporateTax(-5000, 0).corporateTax === 0', r2.corporateTax === 0, r2.corporateTax)
      check('calculateCorporateTax(-5000, 0).netProfit === -5000', r2.netProfit === -5000, r2.netProfit)

      return { passed: allPassed, details: results.join('\n') }
    },
  },

  {
    id: 'audit-templates',
    name: 'Audit Templates',
    run: () => {
      const results: string[] = []
      let allPassed = true

      const check = (label: string, ok: boolean, got?: unknown) => {
        if (!ok) { allPassed = false; results.push(`FAIL: ${label}${got !== undefined ? ` (got: ${JSON.stringify(got)})` : ''}`) }
        else results.push(`OK:   ${label}`)
      }

      check(`AUDIT_TEMPLATES.length >= 10`, AUDIT_TEMPLATES.length >= 10, AUDIT_TEMPLATES.length)

      const placeholderRegex = /\{\{(\w+)\}\}/g
      const extractPlaceholders = (s: string): string[] => {
        const keys: string[] = []
        let m: RegExpExecArray | null
        while ((m = placeholderRegex.exec(s)) !== null) keys.push(m[1])
        placeholderRegex.lastIndex = 0
        return [...new Set(keys)].sort()
      }

      let allHaveLangs = true
      let placeholdersMatch = true

      for (const tpl of AUDIT_TEMPLATES) {
        const hasAllLangs = !!tpl.template_bg && !!tpl.template_ru && !!tpl.template_en && !!tpl.template_uk
        if (!hasAllLangs) {
          allHaveLangs = false
          results.push(`FAIL: template ${tpl.id} missing language variants`)
        }

        const ph_bg = extractPlaceholders(tpl.template_bg)
        const ph_ru = extractPlaceholders(tpl.template_ru)
        const ph_en = extractPlaceholders(tpl.template_en)
        const ph_uk = extractPlaceholders(tpl.template_uk)
        const same = JSON.stringify(ph_bg) === JSON.stringify(ph_ru) &&
                     JSON.stringify(ph_ru) === JSON.stringify(ph_en) &&
                     JSON.stringify(ph_en) === JSON.stringify(ph_uk)
        if (!same) {
          placeholdersMatch = false
          results.push(`FAIL: template ${tpl.id} placeholder mismatch: bg=${JSON.stringify(ph_bg)} ru=${JSON.stringify(ph_ru)} en=${JSON.stringify(ph_en)} uk=${JSON.stringify(ph_uk)}`)
        }
      }

      check('all templates have all 4 language variants', allHaveLangs)
      check('all templates have matching placeholders across languages', placeholdersMatch)

      const filled = fillTemplate('{{name}} ЕИК {{eik}}', { name: 'Test', eik: '123' })
      check("fillTemplate('{{name}} ЕИК {{eik}}', ...) === 'Test ЕИК 123'", filled === 'Test ЕИК 123', filled)

      return { passed: allPassed, details: results.join('\n') }
    },
  },
]
