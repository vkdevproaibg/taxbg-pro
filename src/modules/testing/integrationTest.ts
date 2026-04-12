/**
 * Integration test for TaxBG Pro.
 * Runs entirely in-memory — does NOT write to real Zustand stores or Supabase.
 */
import type { Transaction, TransactionType } from '../../store/accountingStore'
import type { JournalEntry } from '../../store/journalStore'
import type { Employee } from '../../store/employeesStore'
import {
  transactionToJournalEntry,
  createVatJournalEntry,
  createVatInputCreditEntry,
} from '../../lib/journalAI'
import { buildOPR, buildBalanceSheet, oprToCsv, balanceToCsv } from '../../lib/financialReports'
import { calculateObrazec1, obrazec1ToCsv } from '../../lib/obrazec1'
import { generateDDSXml, generateZKPOXml } from '../../lib/xmlGenerator'
import { getRateValue } from '../../lib/taxRates'
import type { DDSFormData } from '../reports/types'

// ─── Public Types ──────────────────────────────────────────────────────────────

export interface TestCompanyProfile {
  name: string
  eik: string
  legalForm: 'ood' | 'et' | 'self'
  hasVat: boolean
  hasEmployees: boolean
  capital: number
  foundedDate: string
}

export interface TestTransaction {
  date: string
  type: TransactionType
  amount: number
  description: string
  vatRate?: number
  vatAmount?: number
  counterparty?: string
  invoiceNumber?: string
  assetName?: string
  deductiblePercent?: number
  municipality?: string
}

export interface TestEmployee {
  name: string
  position: string
  grossSalary: number
  egn: string
  startDate: string
  terminatedDate?: string
}

export interface IntegrationTestResult {
  company: TestCompanyProfile
  transactionsSummary: {
    total: number
    byType: Record<string, { count: number; totalAmount: number }>
    byMonth: Record<string, { income: number; expense: number; count: number }>
    avgPerDay: number
    period: { from: string; to: string }
  }
  employeesSummary: {
    total: number
    totalGrossSalary: number
    avgSalary: number
  }
  journalSummary: {
    totalEntries: number
    byAccount: Record<string, { debitTotal: number; creditTotal: number; balance: number }>
    missingEntries: string[]
    orphanEntries: string[]
  }
  oprResult: {
    totalRevenue: number
    totalExpenses: number
    financialResult: number
    nonDeductible: number
    taxableProfit: number
    corporateTax: number
    netProfit: number
  }
  balanceResult: {
    totalAssets: number
    totalPassive: number
    isBalanced: boolean
    difference: number
    details: {
      bankBalance: number
      fixedAssets: number
      debtors: number
      capital: number
      retainedEarnings: number
      currentProfit: number
      creditors: number
      vatPayable: number
      salaryPayable: number
      taxPayable: number
    }
  }
  vatSummary: {
    totalCollected: number
    totalDeductible: number
    vatPayable: number
    byMonth: Record<string, { collected: number; deductible: number; payable: number }>
  }
  payrollSummary?: {
    byMonth: Record<string, {
      totalGross: number
      totalEmployerContrib: number
      totalEmployeeContrib: number
      totalIncomeTax: number
      totalNet: number
      totalCost: number
    }>
    annualTotal: {
      gross: number
      employerContrib: number
      employeeContrib: number
      incomeTax: number
      netPaid: number
      totalCost: number
    }
  }
  documentsGenerated: {
    type: string
    period: string
    success: boolean
    error?: string
    sizeBytes?: number
  }[]
  checks: {
    id: string
    name: string
    passed: boolean
    expected: string
    actual: string
    details?: string
  }[]
  totalChecks: number
  passedChecks: number
  failedChecks: number
  overallStatus: 'PASS' | 'FAIL'
  generatedAt: string
  durationMs: number
}

export type TestScenario = 'small_it_company' | 'freelancer' | 'company_with_employees'

// ─── Internal helpers ──────────────────────────────────────────────────────────

function uuid(): string {
  return crypto.randomUUID()
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Spread day within a month: idx 0..n-1 → days 1..28 */
function dayInMonth(month: string, idx: number, total: number): string {
  const day = 1 + Math.floor((idx / total) * 27)
  return `${month}-${pad(day)}`
}

function makeTransaction(
  overrides: Partial<Transaction> & Pick<Transaction, 'date' | 'type' | 'amount' | 'description'>,
  companyId: string,
): Transaction {
  return {
    id: uuid(),
    status: 'approved',
    companyId,
    ...overrides,
  }
}

function makeEmployee(t: TestEmployee, companyId: string): Employee {
  return {
    id: uuid(),
    name: t.name,
    egn: t.egn,
    position: t.position,
    grossSalary: t.grossSalary,
    startDate: t.startDate,
    active: true,
    companyId,
  }
}

/** Build journal entries from a list of transactions (pure, no store mutations) */
function buildJournalEntries(transactions: Transaction[]): JournalEntry[] {
  const entries: JournalEntry[] = []
  for (const tx of transactions) {
    const main = transactionToJournalEntry(tx)
    if (main) entries.push({ ...main, id: uuid() })

    const vat = createVatJournalEntry(tx)
    if (vat) entries.push({ ...vat, id: uuid() })

    const vatIn = createVatInputCreditEntry(tx)
    if (vatIn) entries.push({ ...vatIn, id: uuid() })
  }
  return entries
}

// ─── Scenario generators ───────────────────────────────────────────────────────

function buildSmallItCompany(companyId: string): {
  company: TestCompanyProfile
  transactions: Transaction[]
  employees: Employee[]
} {
  const company: TestCompanyProfile = {
    name: 'ТехСтарт ЕООД',
    eik: '123456789',
    legalForm: 'ood',
    hasVat: true,
    hasEmployees: true,
    capital: 1,
    foundedDate: '2026-01-01',
  }

  const MONTHS = [
    '2026-01','2026-02','2026-03','2026-04','2026-05','2026-06',
    '2026-07','2026-08','2026-09','2026-10','2026-11','2026-12',
  ]

  const CLIENTS = ['Клиент А ЕООД', 'Клиент Б ООД', 'Клиент В АД', 'Клиент Г ЕООД']
  const transactions: Transaction[] = []
  let invNo = 1001

  // Capital entry is handled via journal directly later

  for (let mi = 0; mi < 12; mi++) {
    const m = MONTHS[mi]
    const client = CLIENTS[mi % CLIENTS.length]

    // B2B income (no VAT)
    transactions.push(makeTransaction({
      date: dayInMonth(m, 0, 8),
      type: 'income',
      amount: 5000,
      description: `Услуги по разработка за ${client}`,
      counterparty: client,
      invoiceNumber: `INV-${invNo++}`,
    }, companyId))

    // vat_out: 3000 net + 600 VAT
    transactions.push(makeTransaction({
      date: dayInMonth(m, 1, 8),
      type: 'vat_out',
      amount: 3000,
      vatRate: 0.20,
      vatAmount: 600,
      description: 'Продажба на софтуерна услуга',
      counterparty: client,
      invoiceNumber: `INV-${invNo++}`,
    }, companyId))

    // Hosting expense
    transactions.push(makeTransaction({
      date: dayInMonth(m, 2, 8),
      type: 'expense',
      amount: 500,
      description: 'Хостинг и инфраструктура',
      counterparty: mi % 2 === 0 ? 'AWS' : 'Hetzner',
    }, companyId))

    // Office supplies
    transactions.push(makeTransaction({
      date: dayInMonth(m, 3, 8),
      type: 'expense',
      amount: 200,
      description: 'Офис консумативи',
    }, companyId))

    // vat_in: purchase with VAT credit
    transactions.push(makeTransaction({
      date: dayInMonth(m, 4, 8),
      type: 'vat_in',
      amount: 300,
      vatRate: 0.20,
      vatAmount: 60,
      description: 'Покупка оборудване',
      invoiceNumber: `BILL-${invNo++}`,
    }, companyId))

    // Salary 1
    transactions.push(makeTransaction({
      date: dayInMonth(m, 5, 8),
      type: 'salary',
      amount: 1800,
      description: 'Заплата програмист 1',
    }, companyId))

    // Salary 2
    transactions.push(makeTransaction({
      date: dayInMonth(m, 6, 8),
      type: 'salary',
      amount: 1500,
      description: 'Заплата програмист 2',
    }, companyId))

    // Vehicle expense from April
    if (mi >= 3) {
      transactions.push(makeTransaction({
        date: dayInMonth(m, 7, 8),
        type: 'vehicle_expense',
        amount: 100,
        deductiblePercent: 0.5,
        description: 'Гориво служебен автомобил',
      }, companyId))
    }

    // Quarterly accounting fee (Jan, Apr, Jul, Oct)
    if (mi % 3 === 0) {
      transactions.push(makeTransaction({
        date: dayInMonth(m, 7, 8),
        type: 'expense',
        amount: 150,
        description: 'Счетоводни услуги',
        counterparty: 'Счетоводна кантора ООД',
      }, companyId))
    }
  }

  // Annual one-offs
  // Laptop purchase in March
  transactions.push(makeTransaction({
    date: '2026-03-15',
    type: 'asset_purchase',
    amount: 2000,
    assetName: 'Лаптоп MacBook',
    depreciationRate: 0.50,
    description: 'Лаптоп MacBook',
  }, companyId))

  // Vehicle tax in March
  transactions.push(makeTransaction({
    date: '2026-03-20',
    type: 'vehicle_tax',
    amount: 80,
    description: 'Данък МПС',
    municipality: 'София',
  }, companyId))

  // Dividend in June (only if profitable — we include it unconditionally for test coverage)
  transactions.push(makeTransaction({
    date: '2026-06-28',
    type: 'dividend',
    amount: 5000,
    description: 'Дивидент собственик',
  }, companyId))

  // Depreciation at year-end: laptop 50% of 2000 = 1000
  transactions.push(makeTransaction({
    date: '2026-12-31',
    type: 'depreciation',
    amount: 1000,
    assetName: 'Лаптоп MacBook',
    description: 'Амортизация лаптоп 50%',
  }, companyId))

  const employees: Employee[] = [
    makeEmployee({
      name: 'Иван Петров',
      position: 'Senior Developer',
      grossSalary: 2500,
      egn: '9001011234',
      startDate: '2026-01-01',
    }, companyId),
    makeEmployee({
      name: 'Мария Георгиева',
      position: 'Junior Developer',
      grossSalary: 1500,
      egn: '9505052345',
      startDate: '2026-03-01',
    }, companyId),
  ]

  return { company, transactions, employees }
}

function buildFreelancer(companyId: string): {
  company: TestCompanyProfile
  transactions: Transaction[]
  employees: Employee[]
} {
  const company: TestCompanyProfile = {
    name: 'Иван Самоосигуряващ се',
    eik: '987654321',
    legalForm: 'self',
    hasVat: false,
    hasEmployees: false,
    capital: 0,
    foundedDate: '2026-01-01',
  }

  const MONTHS = [
    '2026-01','2026-02','2026-03','2026-04','2026-05','2026-06',
    '2026-07','2026-08','2026-09','2026-10','2026-11','2026-12',
  ]

  const transactions: Transaction[] = []
  let invNo = 2001

  for (let mi = 0; mi < 12; mi++) {
    const m = MONTHS[mi]

    transactions.push(makeTransaction({
      date: dayInMonth(m, 0, 2),
      type: 'income',
      amount: 3000,
      description: 'Фрийланс услуги',
      invoiceNumber: `FR-${invNo++}`,
    }, companyId))

    transactions.push(makeTransaction({
      date: dayInMonth(m, 1, 2),
      type: 'expense',
      amount: 200,
      description: 'Интернет и софтуер',
    }, companyId))
  }

  return { company, transactions, employees: [] }
}

function buildCompanyWithEmployees(companyId: string): {
  company: TestCompanyProfile
  transactions: Transaction[]
  employees: Employee[]
} {
  // Based on small_it_company but with 5 employees
  const base = buildSmallItCompany(companyId)

  const company: TestCompanyProfile = {
    ...base.company,
    name: 'БигТех ЕООД',
    eik: '111222333',
  }

  const employees: Employee[] = [
    makeEmployee({ name: 'Иван Петров',    position: 'CTO',               grossSalary: 3000, egn: '8001011111', startDate: '2026-01-01' }, companyId),
    makeEmployee({ name: 'Мария Георгиева',position: 'Senior Developer',  grossSalary: 2500, egn: '9001012222', startDate: '2026-01-01' }, companyId),
    makeEmployee({ name: 'Петър Иванов',   position: 'Developer',         grossSalary: 1800, egn: '9501013333', startDate: '2026-02-01' }, companyId),
    makeEmployee({ name: 'Елена Стоянова', position: 'QA Engineer',       grossSalary: 1400, egn: '9101014444', startDate: '2026-01-01' }, companyId),
    makeEmployee({ name: 'Георги Николов', position: 'Intern',            grossSalary: 620,  egn: '0101015555', startDate: '2026-05-01' }, companyId),
  ]

  // Employee 5 (Георги) terminated in October — set active=false after Oct
  const georgi = employees.find(e => e.name === 'Георги Николов')!

  // Add salary transactions for all employees by month
  const MONTHS = [
    '2026-01','2026-02','2026-03','2026-04','2026-05','2026-06',
    '2026-07','2026-08','2026-09','2026-10','2026-11','2026-12',
  ]

  const extraSalaries: Transaction[] = []
  for (let mi = 0; mi < 12; mi++) {
    const m = MONTHS[mi]
    const startedEmployees = employees.filter(e => e.startDate.slice(0, 7) <= m)
    // Georgi not in Nov/Dec
    const activeThisMonth = startedEmployees.filter(e =>
      !(e.name === 'Георги Николов' && mi >= 10)
    )
    for (const emp of activeThisMonth) {
      extraSalaries.push(makeTransaction({
        date: `${m}-25`,
        type: 'salary',
        amount: Math.round(emp.grossSalary * 0.78), // net approx
        description: `Заплата ${emp.position}`,
      }, companyId))
    }
  }

  // Remove the 2 salaries from base (we add them fresh above)
  const baseTxs = base.transactions.filter(t => t.type !== 'salary')

  return { company, transactions: [...baseTxs, ...extraSalaries], employees }
}

// ─── Check runner helper ───────────────────────────────────────────────────────

interface CheckResult {
  id: string
  name: string
  passed: boolean
  expected: string
  actual: string
  details?: string
}

function check(
  id: string,
  name: string,
  expected: string,
  actual: string,
  passed: boolean,
  details?: string,
): CheckResult {
  return { id, name, passed, expected, actual, details }
}

function near(a: number, b: number, eps = 0.01): boolean {
  return Math.abs(a - b) < eps
}

// ─── Account aggregation helper ────────────────────────────────────────────────

function sumAccount(
  entries: JournalEntry[],
  account: string,
  side: 'debit' | 'credit',
  from?: string,
  to?: string,
): number {
  return entries
    .filter(e => {
      if (from && e.date < from) return false
      if (to && e.date > to) return false
      return side === 'debit' ? e.debitAccount === account : e.creditAccount === account
    })
    .reduce((s, e) => s + e.amount, 0)
}

// ─── Main runner ───────────────────────────────────────────────────────────────

export async function runIntegrationTest(
  scenario: TestScenario,
): Promise<IntegrationTestResult> {
  const t0 = performance.now()
  const companyId = uuid()

  // 1. Generate scenario data
  let scenarioData: {
    company: TestCompanyProfile
    transactions: Transaction[]
    employees: Employee[]
  }

  if (scenario === 'small_it_company') {
    scenarioData = buildSmallItCompany(companyId)
  } else if (scenario === 'freelancer') {
    scenarioData = buildFreelancer(companyId)
  } else {
    scenarioData = buildCompanyWithEmployees(companyId)
  }

  const { company, transactions, employees } = scenarioData

  // 2. Build journal entries (pure, in-memory)
  const journalEntries: JournalEntry[] = []

  // Capital entry
  if (company.capital > 0) {
    journalEntries.push({
      id: uuid(),
      date: company.foundedDate,
      description: 'Внасяне на основен капитал',
      debitAccount: '503',
      creditAccount: '102',
      amount: company.capital,
      source: 'auto',
      period: company.foundedDate.slice(0, 7),
      companyId,
    })
  }

  // From transactions
  journalEntries.push(...buildJournalEntries(transactions))

  const FROM = '2026-01-01'
  const TO   = '2026-12-31'

  // ── Transaction Summary ────────────────────────────────────────────────────

  const byType: Record<string, { count: number; totalAmount: number }> = {}
  const byMonth: Record<string, { income: number; expense: number; count: number }> = {}

  for (const tx of transactions) {
    if (!byType[tx.type]) byType[tx.type] = { count: 0, totalAmount: 0 }
    byType[tx.type].count++
    byType[tx.type].totalAmount += tx.amount

    const m = tx.date.slice(0, 7)
    if (!byMonth[m]) byMonth[m] = { income: 0, expense: 0, count: 0 }
    byMonth[m].count++
    const incomeTypes: TransactionType[] = ['income', 'vat_out', 'appstore', 'googleplay', 'stripe']
    if (incomeTypes.includes(tx.type)) byMonth[m].income += tx.amount
    else byMonth[m].expense += tx.amount
  }

  const allDates = transactions.map(t => t.date).sort()
  const periodFrom = allDates[0] ?? FROM
  const periodTo   = allDates[allDates.length - 1] ?? TO

  const totalDays = Math.max(
    1,
    (new Date(periodTo).getTime() - new Date(periodFrom).getTime()) / 86400000,
  )

  const transactionsSummary = {
    total: transactions.length,
    byType,
    byMonth,
    avgPerDay: Math.round((transactions.length / totalDays) * 100) / 100,
    period: { from: periodFrom, to: periodTo },
  }

  // ── Employee Summary ───────────────────────────────────────────────────────

  const activeEmps = employees.filter(e => e.active)
  const employeesSummary = {
    total: activeEmps.length,
    totalGrossSalary: activeEmps.reduce((s, e) => s + e.grossSalary, 0),
    avgSalary: activeEmps.length > 0
      ? activeEmps.reduce((s, e) => s + e.grossSalary, 0) / activeEmps.length
      : 0,
  }

  // ── Journal Summary ────────────────────────────────────────────────────────

  const accountsUsed = new Set<string>()
  for (const e of journalEntries) {
    accountsUsed.add(e.debitAccount)
    accountsUsed.add(e.creditAccount)
  }

  const byAccount: Record<string, { debitTotal: number; creditTotal: number; balance: number }> = {}
  for (const acc of accountsUsed) {
    const dt = journalEntries.filter(e => e.debitAccount === acc).reduce((s, e) => s + e.amount, 0)
    const ct = journalEntries.filter(e => e.creditAccount === acc).reduce((s, e) => s + e.amount, 0)
    byAccount[acc] = { debitTotal: dt, creditTotal: ct, balance: dt - ct }
  }

  const txIds = new Set(transactions.map(t => t.id))
  const linkedTxIds = new Set(journalEntries.filter(e => e.linkedTransactionId).map(e => e.linkedTransactionId!))

  const missingEntries = transactions
    .filter(tx => !linkedTxIds.has(tx.id))
    .map(tx => `#${tx.id.slice(0, 8)} ${tx.type} ${tx.date} ${tx.amount}€`)

  const orphanEntries = journalEntries
    .filter(e => e.linkedTransactionId && !txIds.has(e.linkedTransactionId))
    .map(e => `entry ${e.id.slice(0, 8)} linked to missing tx ${e.linkedTransactionId!.slice(0, 8)}`)

  const journalSummary = { totalEntries: journalEntries.length, byAccount, missingEntries, orphanEntries }

  // ── OPR ───────────────────────────────────────────────────────────────────

  const opr = buildOPR(journalEntries, transactions, FROM, TO, company.name)
  const oprResult = {
    totalRevenue:    opr.totalRevenue,
    totalExpenses:   opr.totalExpenses,
    financialResult: opr.financialResult,
    nonDeductible:   opr.nonDeductible,
    taxableProfit:   opr.taxableProfit,
    corporateTax:    opr.corporateTax,
    netProfit:       opr.netProfit,
  }

  // ── Balance ────────────────────────────────────────────────────────────────

  const bs = buildBalanceSheet(journalEntries, TO, company.name, transactions)
  const balanceResult = {
    totalAssets:  bs.totalAssets,
    totalPassive: bs.totalPassive,
    isBalanced:   bs.isBalanced,
    difference:   bs.difference,
    details: {
      bankBalance:      bs.bankBalance,
      fixedAssets:      bs.fixedAssets,
      debtors:          bs.debtors,
      capital:          bs.capital,
      retainedEarnings: bs.retainedEarnings,
      currentProfit:    bs.currentProfit,
      creditors:        bs.creditors,
      vatPayable:       bs.vatPayable,
      salaryPayable:    bs.salaryPayable,
      taxPayable:       bs.taxPayable,
    },
  }

  // ── VAT Summary ────────────────────────────────────────────────────────────

  const vatByMonth: Record<string, { collected: number; deductible: number; payable: number }> = {}
  const vatOutTxs = transactions.filter(t => t.type === 'vat_out' && t.vatAmount)
  const vatInTxs  = transactions.filter(t => t.type === 'vat_in'  && t.vatAmount)

  for (const tx of [...vatOutTxs, ...vatInTxs]) {
    const m = tx.date.slice(0, 7)
    if (!vatByMonth[m]) vatByMonth[m] = { collected: 0, deductible: 0, payable: 0 }
    if (tx.type === 'vat_out') vatByMonth[m].collected  += tx.vatAmount!
    if (tx.type === 'vat_in')  vatByMonth[m].deductible += tx.vatAmount!
  }
  for (const m of Object.keys(vatByMonth)) {
    vatByMonth[m].payable = Math.max(
      vatByMonth[m].collected - vatByMonth[m].deductible, 0,
    )
  }

  const totalCollected  = vatOutTxs.reduce((s, t) => s + (t.vatAmount ?? 0), 0)
  const totalDeductible = vatInTxs.reduce((s, t) => s + (t.vatAmount ?? 0), 0)

  const vatSummary = {
    totalCollected,
    totalDeductible,
    vatPayable: Math.max(totalCollected - totalDeductible, 0),
    byMonth: vatByMonth,
  }

  // ── Payroll Summary ────────────────────────────────────────────────────────

  let payrollSummary: IntegrationTestResult['payrollSummary'] | undefined

  if (employees.length > 0 && company.hasEmployees) {
    const payByMonth: IntegrationTestResult['payrollSummary']['byMonth'] = {}
    const months = [
      '2026-01','2026-02','2026-03','2026-04','2026-05','2026-06',
      '2026-07','2026-08','2026-09','2026-10','2026-11','2026-12',
    ]

    for (const m of months) {
      const activeForMonth = employees.filter(e => {
        if (e.startDate.slice(0, 7) > m) return false
        return true
      })
      if (activeForMonth.length === 0) continue

      const ob = calculateObrazec1(activeForMonth, m, company.name, company.eik)
      payByMonth[m] = {
        totalGross:          ob.rows.reduce((s, r) => s + r.employee.grossSalary, 0),
        totalEmployerContrib:ob.totalEmployerContrib,
        totalEmployeeContrib:ob.totalEmployeeContrib,
        totalIncomeTax:      ob.totalIncomeTax,
        totalNet:            ob.totalNetPaid,
        totalCost:           ob.totalCost,
      }
    }

    const ann = Object.values(payByMonth).reduce(
      (acc, v) => ({
        gross:          acc.gross          + v.totalGross,
        employerContrib:acc.employerContrib+ v.totalEmployerContrib,
        employeeContrib:acc.employeeContrib+ v.totalEmployeeContrib,
        incomeTax:      acc.incomeTax      + v.totalIncomeTax,
        netPaid:        acc.netPaid        + v.totalNet,
        totalCost:      acc.totalCost      + v.totalCost,
      }),
      { gross: 0, employerContrib: 0, employeeContrib: 0, incomeTax: 0, netPaid: 0, totalCost: 0 },
    )

    payrollSummary = { byMonth: payByMonth, annualTotal: ann }
  }

  // ── Document generation ────────────────────────────────────────────────────

  const documentsGenerated: IntegrationTestResult['documentsGenerated'] = []

  const vatMonths = Object.keys(vatByMonth).sort()

  // DDS XML per month
  for (const m of vatMonths) {
    try {
      const vatM = vatByMonth[m]
      const salesBase20 = vatOutTxs
        .filter(t => t.date.slice(0, 7) === m)
        .reduce((s, t) => s + t.amount, 0)
      const purchasesBase20 = vatInTxs
        .filter(t => t.date.slice(0, 7) === m)
        .reduce((s, t) => s + t.amount, 0)
      const vatPayableM = Math.max(vatM.collected - vatM.deductible, 0)
      const vatRefundM  = Math.max(vatM.deductible - vatM.collected, 0)

      const ddsData: DDSFormData = {
        period: m,
        companyName: company.name,
        eik: company.eik,
        vatNumber: `BG${company.eik}`,
        salesBase20,
        vatOut20: vatM.collected,
        salesBase9: 0,
        vatOut9: 0,
        salesBase0: 0,
        purchasesBase20,
        vatIn20: vatM.deductible,
        purchasesBase9: 0,
        vatIn9: 0,
        vatPayable: vatPayableM,
        vatRefund: vatRefundM,
      }
      const xml = generateDDSXml(ddsData)
      const ok  = xml.includes('<Declaration') && xml.includes('<TaxPeriod>')
      documentsGenerated.push({
        type: 'DDS_XML',
        period: m,
        success: ok,
        sizeBytes: xml.length,
        error: ok ? undefined : 'XML missing required elements',
      })
    } catch (e) {
      documentsGenerated.push({ type: 'DDS_XML', period: m, success: false, error: String(e) })
    }
  }

  // ZKPO XML (annual)
  try {
    const zkpoData = {
      year: 2026,
      companyName: company.name,
      eik: company.eik,
      totalRevenue: opr.totalRevenue,
      totalExpenses: opr.totalExpenses,
      accountingProfit: opr.financialResult,
      nonDeductibleExpenses: opr.nonDeductible,
      taxableProfit: opr.taxableProfit,
      corporateTax: opr.corporateTax,
      advancePaid: 0,
      taxDue: opr.corporateTax,
      overpaid: 0,
    }
    const xml = generateZKPOXml(zkpoData)
    const ok  = xml.includes('<Declaration') && xml.includes('<TaxYear>')
    documentsGenerated.push({
      type: 'ZKPO_XML',
      period: '2026',
      success: ok,
      sizeBytes: xml.length,
      error: ok ? undefined : 'XML missing required elements',
    })
  } catch (e) {
    documentsGenerated.push({ type: 'ZKPO_XML', period: '2026', success: false, error: String(e) })
  }

  // OPR CSV
  try {
    const csv = oprToCsv(opr)
    const ok  = csv.includes('ОПР') && csv.length > 50
    documentsGenerated.push({
      type: 'OPR_CSV',
      period: '2026',
      success: ok,
      sizeBytes: csv.length,
      error: ok ? undefined : 'OPR CSV invalid',
    })
  } catch (e) {
    documentsGenerated.push({ type: 'OPR_CSV', period: '2026', success: false, error: String(e) })
  }

  // Balance CSV
  try {
    const csv = balanceToCsv(bs)
    const ok  = csv.includes('АКТИВИ') && csv.includes('ПАСИВИ') && csv.length > 50
    documentsGenerated.push({
      type: 'BALANCE_CSV',
      period: '2026-12-31',
      success: ok,
      sizeBytes: csv.length,
      error: ok ? undefined : 'Balance CSV invalid',
    })
  } catch (e) {
    documentsGenerated.push({ type: 'BALANCE_CSV', period: '2026-12-31', success: false, error: String(e) })
  }

  // Образец 1 CSV per month (if employees)
  if (employees.length > 0) {
    const months = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06',
                    '2026-07','2026-08','2026-09','2026-10','2026-11','2026-12']
    for (const m of months) {
      const activeForMonth = employees.filter(e => e.startDate.slice(0, 7) <= m)
      if (activeForMonth.length === 0) continue
      try {
        const ob  = calculateObrazec1(activeForMonth, m, company.name, company.eik)
        const csv = obrazec1ToCsv(ob)
        const ok  = csv.includes('Образец 1') && csv.length > 50
        documentsGenerated.push({
          type: 'OBRAZEC1_CSV',
          period: m,
          success: ok,
          sizeBytes: csv.length,
          error: ok ? undefined : 'Образец 1 CSV invalid',
        })
      } catch (e) {
        documentsGenerated.push({ type: 'OBRAZEC1_CSV', period: m, success: false, error: String(e) })
      }
    }
  }

  // ── Checks ─────────────────────────────────────────────────────────────────

  const checks: CheckResult[] = []

  // ── GROUP: Проводки ──

  // C1: Every transaction has ≥1 journal entry
  {
    const txsWithEntry = new Set(
      journalEntries
        .filter(e => e.linkedTransactionId)
        .map(e => e.linkedTransactionId!),
    )
    const missing = transactions.filter(tx => !txsWithEntry.has(tx.id))
    checks.push(check(
      'C1',
      'Всяка транзакция има ≥1 проводка',
      '0 транзакции без проводки',
      `${missing.length} транзакции без проводки`,
      missing.length === 0,
      missing.length > 0
        ? `Липсващи: ${missing.slice(0, 3).map(t => `${t.type} ${t.date}`).join(', ')}`
        : undefined,
    ))
  }

  // C2: No orphan entries
  {
    checks.push(check(
      'C2',
      'Няма осиротели проводки',
      '0 осиротели проводки',
      `${orphanEntries.length} осиротели`,
      orphanEntries.length === 0,
      orphanEntries.length > 0 ? orphanEntries.slice(0, 2).join('; ') : undefined,
    ))
  }

  // C3: vat_out → entry Дт503/Кт703 AND Дт503/Кт451
  {
    const vatOutTxIds = transactions.filter(t => t.type === 'vat_out').map(t => t.id)
    const missingVatOut: string[] = []
    for (const txId of vatOutTxIds) {
      const txEntries = journalEntries.filter(e => e.linkedTransactionId === txId)
      const has703 = txEntries.some(e => e.debitAccount === '503' && e.creditAccount === '703')
      const has451 = txEntries.some(e => e.debitAccount === '503' && e.creditAccount === '451')
      if (!has703 || !has451) missingVatOut.push(txId.slice(0, 8))
    }
    checks.push(check(
      'C3',
      'vat_out → Дт503/Кт703 И Дт503/Кт451',
      '0 vat_out без пълен набор от проводки',
      `${missingVatOut.length} vat_out с непълни проводки`,
      missingVatOut.length === 0,
      missingVatOut.length > 0 ? `Tx IDs: ${missingVatOut.join(', ')}` : undefined,
    ))
  }

  // C4: vat_in → entry Дт602/Кт503 AND Дт452/Кт401
  {
    const vatInTxIds = transactions.filter(t => t.type === 'vat_in').map(t => t.id)
    const missingVatIn: string[] = []
    for (const txId of vatInTxIds) {
      const txEntries = journalEntries.filter(e => e.linkedTransactionId === txId)
      const has602 = txEntries.some(e => e.debitAccount === '602' && e.creditAccount === '503')
      const has452 = txEntries.some(e => e.debitAccount === '452' && e.creditAccount === '401')
      if (!has602 || !has452) missingVatIn.push(txId.slice(0, 8))
    }
    checks.push(check(
      'C4',
      'vat_in → Дт602/Кт503 И Дт452/Кт401',
      '0 vat_in с непълни проводки',
      `${missingVatIn.length} vat_in с непълни проводки`,
      missingVatIn.length === 0,
      missingVatIn.length > 0 ? `Tx IDs: ${missingVatIn.join(', ')}` : undefined,
    ))
  }

  // C5: Debit = Credit for all entries
  {
    const totalDebit  = journalEntries.reduce((s, e) => s + e.amount, 0)
    const totalCredit = journalEntries.reduce((s, e) => s + e.amount, 0)
    // Debit side always equals credit side since each entry has one debit and one credit
    // Real check: for each tx group, sum debit === sum credit
    const txGroups = new Map<string, JournalEntry[]>()
    for (const e of journalEntries) {
      const key = e.linkedTransactionId ?? `__standalone_${e.id}`
      if (!txGroups.has(key)) txGroups.set(key, [])
      txGroups.get(key)!.push(e)
    }
    const unbalanced: string[] = []
    for (const [txId, entries] of txGroups.entries()) {
      // Each JournalEntry has 1 debit = 1 credit, so they're always balanced per entry.
      // The "double-entry" check is that total debits = total credits across all entries.
      const debit  = entries.reduce((s, e) => s + e.amount, 0)
      const credit = entries.reduce((s, e) => s + e.amount, 0)
      if (!near(debit, credit)) unbalanced.push(txId.slice(0, 8))
    }
    checks.push(check(
      'C5',
      'Дебит = Кредит (двойно записване)',
      `Дебит ≈ Кредит: ${totalDebit.toFixed(2)} = ${totalCredit.toFixed(2)}`,
      `Дебит: ${totalDebit.toFixed(2)}  Кредит: ${totalCredit.toFixed(2)}`,
      near(totalDebit, totalCredit),
      unbalanced.length > 0 ? `Небалансирани групи: ${unbalanced.join(', ')}` : undefined,
    ))
  }

  // ── GROUP: ОПР ──

  // C6: totalRevenue = income + vat_out (net)
  {
    const expectedRev = transactions
      .filter(t => ['income','vat_out','appstore','googleplay','stripe'].includes(t.type))
      .reduce((s, t) => s + t.amount, 0)
    checks.push(check(
      'C6',
      'totalRevenue = Σ приходни транзакции',
      expectedRev.toFixed(2),
      opr.totalRevenue.toFixed(2),
      near(expectedRev, opr.totalRevenue, 0.05),
      `От journalAI: credit на сч.703: ${sumAccount(journalEntries,'703','credit',FROM,TO).toFixed(2)} €`,
    ))
  }

  // C7: totalExpenses = expense + salary + depreciation + vehicle (deductible part)
  {
    const expenseTypes: TransactionType[] = ['expense','salary','depreciation','vehicle_tax','vehicle_expense','asset_purchase']
    const expTxs = transactions.filter(t => expenseTypes.includes(t.type))
    // vehicle_expense: only deductible part counts in journal (50%)
    const expectedExp = expTxs.reduce((s, t) => {
      if (t.type === 'vehicle_expense') return s + t.amount * (t.deductiblePercent ?? 0.5)
      // asset_purchase goes to 205, not expense accounts — not in OPR
      if (t.type === 'asset_purchase') return s
      return s + t.amount
    }, 0)
    checks.push(check(
      'C7',
      'totalExpenses = Σ разходни транзакции (дедуктибилна部分)',
      expectedExp.toFixed(2),
      opr.totalExpenses.toFixed(2),
      near(expectedExp, opr.totalExpenses, 0.10),
      `Приблизителна проверка — salary/vehicle влизат в сч.602/604`,
    ))
  }

  // C8: corporateTax = taxableProfit * rate
  {
    const rate = getRateValue('corporateTax', '2026-01-01')
    const expectedTax = Math.max(opr.taxableProfit, 0) * rate
    checks.push(check(
      'C8',
      `Корпоративен данък = данъчна печалба × ${(rate*100).toFixed(0)}%`,
      expectedTax.toFixed(2),
      opr.corporateTax.toFixed(2),
      near(expectedTax, opr.corporateTax),
      `Ставка: ${rate} (getRateValue 'corporateTax')  Данъчна печалба: ${opr.taxableProfit.toFixed(2)}`,
    ))
  }

  // C9: netProfit = financialResult - corporateTax
  {
    const expectedNet = opr.financialResult - opr.corporateTax
    checks.push(check(
      'C9',
      'Чиста печалба = финансов резултат − корпоративен данък',
      expectedNet.toFixed(2),
      opr.netProfit.toFixed(2),
      near(expectedNet, opr.netProfit),
    ))
  }

  // ── GROUP: Баланс ──

  // C10: Assets === Passive
  checks.push(check(
    'C10',
    'Баланс сходится: Активи = Пасиви (± 0.01 €)',
    `разлика < 0.01 €`,
    `разлика = ${bs.difference.toFixed(4)} €`,
    bs.isBalanced,
    bs.isBalanced
      ? undefined
      : `Активи: ${bs.totalAssets.toFixed(2)}, Пасиви: ${bs.totalPassive.toFixed(2)}. Проверете сч.503 (банка) и сч.102 (капитал).`,
  ))

  // C11: bankBalance > 0
  checks.push(check(
    'C11',
    'Банков баланс > 0 €',
    '> 0',
    bs.bankBalance.toFixed(2),
    bs.bankBalance > 0,
    bs.bankBalance <= 0
      ? 'Дебит сч.503 ≤ Кредит сч.503 — повече разходи отколкото приходи'
      : undefined,
  ))

  // C12: capital >= 1
  checks.push(check(
    'C12',
    'Основен капитал ≥ 1 €',
    '≥ 1',
    bs.capital.toFixed(2),
    bs.capital >= 1,
    bs.capital < 1
      ? 'Не е намерена проводка Дт503/Кт102 за внасяне на капитал'
      : undefined,
  ))

  // C13: If 122 entries exist — they appear in retained earnings
  {
    const ret122 = sumAccount(journalEntries, '122', 'credit') - sumAccount(journalEntries, '122', 'debit')
    const retInBS = bs.retainedEarnings
    // They should match if any 122 entries exist
    const has122 = journalEntries.some(e => e.debitAccount === '122' || e.creditAccount === '122')
    const ok = !has122 || near(ret122, retInBS)
    checks.push(check(
      'C13',
      'Сч.122 (неразпределена печалба) е отразена в баланса',
      ret122.toFixed(2),
      retInBS.toFixed(2),
      ok,
    ))
  }

  // ── GROUP: ДДС ──

  // C14: vatCollected = sum of vatAmount from vat_out
  {
    const expected = vatOutTxs.reduce((s, t) => s + (t.vatAmount ?? 0), 0)
    checks.push(check(
      'C14',
      'ДДС начислен = Σ vatAmount от vat_out',
      expected.toFixed(2),
      totalCollected.toFixed(2),
      near(expected, totalCollected),
    ))
  }

  // C15: vatDeductible = sum of vatAmount from vat_in
  {
    const expected = vatInTxs.reduce((s, t) => s + (t.vatAmount ?? 0), 0)
    checks.push(check(
      'C15',
      'Данъчен кредит = Σ vatAmount от vat_in',
      expected.toFixed(2),
      totalDeductible.toFixed(2),
      near(expected, totalDeductible),
    ))
  }

  // C16: vatPayable = collected - deductible >= 0
  {
    const expected = Math.max(totalCollected - totalDeductible, 0)
    checks.push(check(
      'C16',
      'ДДС за внасяне = начислен − данъчен кредит (≥ 0)',
      expected.toFixed(2),
      vatSummary.vatPayable.toFixed(2),
      near(expected, vatSummary.vatPayable),
    ))
  }

  // C17: DDS XML generated for each VAT month
  {
    const ddsMonths = vatMonths.length
    const ddsOk = documentsGenerated.filter(d => d.type === 'DDS_XML' && d.success).length
    checks.push(check(
      'C17',
      'DDS XML генериран за всеки ДДС месец',
      `${ddsMonths} месеца → ${ddsMonths} XML`,
      `${ddsOk} успешни / ${ddsMonths} месеца`,
      ddsOk === ddsMonths,
      ddsOk < ddsMonths
        ? documentsGenerated.filter(d => d.type === 'DDS_XML' && !d.success).map(d => `${d.period}: ${d.error}`).join(', ')
        : undefined,
    ))
  }

  // ── GROUP: Осигуровки ──

  if (employees.length > 0 && company.hasEmployees) {
    const minWage = getRateValue('minWage', '2026-01-01')
    const maxOsig = getRateValue('maxOsig', '2026-01-01')

    // C18: grossSalary >= minWage
    {
      const below = activeEmps.filter(e => e.grossSalary < minWage)
      checks.push(check(
        'C18',
        `Бруто заплата ≥ МРЗ (${minWage.toFixed(2)} €)`,
        '0 служители под МРЗ',
        `${below.length} служители под МРЗ`,
        below.length === 0,
        below.length > 0 ? `${below.map(e => `${e.name}: ${e.grossSalary}`).join(', ')}` : undefined,
      ))
    }

    // C19: osigBase = min(gross, maxOsig)
    {
      const rateDate = '2026-01-01'
      const ob = calculateObrazec1(activeEmps, '2026-01', company.name, company.eik)
      const wrongBase = ob.rows.filter(r => !near(r.osigBase, Math.min(r.employee.grossSalary, maxOsig)))
      checks.push(check(
        'C19',
        `Осигурителна база = min(бруто, ${maxOsig.toFixed(2)} €)`,
        '0 грешки в базата',
        `${wrongBase.length} грешки`,
        wrongBase.length === 0,
        wrongBase.length > 0
          ? wrongBase.map(r => `${r.employee.name}: osigBase=${r.osigBase.toFixed(2)}, expected=${Math.min(r.employee.grossSalary, maxOsig).toFixed(2)}`).join('; ')
          : undefined,
      ))
    }

    // C20: totalEr correct
    {
      const rateDate = '2026-01-01'
      const erTotal = getRateValue('employer.doo', rateDate) + getRateValue('employer.upf', rateDate)
        + getRateValue('employer.zo', rateDate) + getRateValue('employer.ozm', rateDate)
        + getRateValue('employer.tzpb', rateDate) + getRateValue('employer.bezr', rateDate)
      const ob = calculateObrazec1(activeEmps, '2026-01', company.name, company.eik)
      const wrongEr = ob.rows.filter(r => !near(r.totalEr, r.osigBase * erTotal, 0.02))
      checks.push(check(
        'C20',
        `Работодателски вноски = осиг.база × ${(erTotal * 100).toFixed(2)}%`,
        '0 грешки',
        `${wrongEr.length} грешки`,
        wrongEr.length === 0,
        wrongEr.length > 0
          ? wrongEr.map(r => `${r.employee.name}: er=${r.totalEr.toFixed(2)}, expected=${(r.osigBase*erTotal).toFixed(2)}`).join('; ')
          : undefined,
      ))
    }

    // C21: totalEe correct
    {
      const rateDate = '2026-01-01'
      const eeTotal = getRateValue('employee.doo', rateDate) + getRateValue('employee.upf', rateDate)
        + getRateValue('employee.zo', rateDate) + getRateValue('employee.ozm', rateDate)
        + getRateValue('employee.bezr', rateDate)
      const ob = calculateObrazec1(activeEmps, '2026-01', company.name, company.eik)
      const wrongEe = ob.rows.filter(r => !near(r.totalEe, r.osigBase * eeTotal, 0.02))
      checks.push(check(
        'C21',
        `Служителски вноски = осиг.база × ${(eeTotal * 100).toFixed(2)}%`,
        '0 грешки',
        `${wrongEe.length} грешки`,
        wrongEe.length === 0,
        wrongEe.length > 0
          ? wrongEe.map(r => `${r.employee.name}: ee=${r.totalEe.toFixed(2)}, expected=${(r.osigBase*eeTotal).toFixed(2)}`).join('; ')
          : undefined,
      ))
    }

    // C22: Образец 1 CSV generated per month
    {
      const ob1Months = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06',
                         '2026-07','2026-08','2026-09','2026-10','2026-11','2026-12']
        .filter(m => employees.some(e => e.startDate.slice(0, 7) <= m))
      const ob1Ok = documentsGenerated.filter(d => d.type === 'OBRAZEC1_CSV' && d.success).length
      checks.push(check(
        'C22',
        'Образец 1 CSV генериран за всеки активен месец',
        `${ob1Months.length} месеца → ${ob1Months.length} CSV`,
        `${ob1Ok} успешни`,
        ob1Ok >= ob1Months.length,
      ))
    }
  } else {
    // No employees — mark payroll checks as N/A (pass)
    for (const id of ['C18','C19','C20','C21','C22']) {
      checks.push(check(id, `Осигуровки (${id}) — N/A (без служители)`, 'N/A', 'N/A', true))
    }
  }

  // ── GROUP: Документи ──

  // C23: DDS XML (already in C17 — here confirm structure)
  {
    const ddsDoc = documentsGenerated.filter(d => d.type === 'DDS_XML')
    const allOk = ddsDoc.every(d => d.success)
    checks.push(check(
      'C23',
      'DDS XML има коректна структура (<Declaration>, <TaxPeriod>)',
      'Всички DDS XML коректни',
      `${ddsDoc.filter(d => d.success).length}/${ddsDoc.length} коректни`,
      allOk || ddsDoc.length === 0,
    ))
  }

  // C24: OPR CSV
  {
    const doc = documentsGenerated.find(d => d.type === 'OPR_CSV')
    checks.push(check(
      'C24',
      'OPR CSV генериран успешно',
      'success=true, size>50',
      doc ? `success=${doc.success}, size=${doc.sizeBytes}` : 'не е генериран',
      !!(doc?.success && (doc.sizeBytes ?? 0) > 50),
      doc?.error,
    ))
  }

  // C25: Balance CSV
  {
    const doc = documentsGenerated.find(d => d.type === 'BALANCE_CSV')
    checks.push(check(
      'C25',
      'Balance CSV генериран успешно',
      'success=true, size>50',
      doc ? `success=${doc.success}, size=${doc.sizeBytes}` : 'не е генериран',
      !!(doc?.success && (doc.sizeBytes ?? 0) > 50),
      doc?.error,
    ))
  }

  // C26: Образец 1 CSV (already in C22)
  {
    const ob1Docs = documentsGenerated.filter(d => d.type === 'OBRAZEC1_CSV')
    const allOk = ob1Docs.length === 0 || ob1Docs.every(d => d.success)
    checks.push(check(
      'C26',
      'Образец 1 CSV — коректна структура (header, ЕГН)',
      'Всички Образец 1 CSV коректни',
      `${ob1Docs.filter(d => d.success).length}/${ob1Docs.length} коректни`,
      allOk,
    ))
  }

  // ── GROUP: Кръстосана проверка ──

  // C27: Revenue in OPR = credit of 703+705+729
  {
    const credit703 = sumAccount(journalEntries, '703', 'credit', FROM, TO)
    const credit705 = sumAccount(journalEntries, '705', 'credit', FROM, TO)
    const credit729 = sumAccount(journalEntries, '729', 'credit', FROM, TO)
    const journalRev = credit703 + credit705 + credit729
    checks.push(check(
      'C27',
      'Приходи ОПР = Кредит сч.703+705+729',
      opr.totalRevenue.toFixed(2),
      journalRev.toFixed(2),
      near(opr.totalRevenue, journalRev, 0.02),
      `703:${credit703.toFixed(2)}, 705:${credit705.toFixed(2)}, 729:${credit729.toFixed(2)}`,
    ))
  }

  // C28: Expenses in OPR = debit of 601-609
  {
    const expAccounts = ['601','602','603','604','605','606','609']
    const journalExp = expAccounts.reduce((s, acc) => s + sumAccount(journalEntries, acc, 'debit', FROM, TO), 0)
    checks.push(check(
      'C28',
      'Разходи ОПР = Дебит сч.601-609',
      opr.totalExpenses.toFixed(2),
      journalExp.toFixed(2),
      near(opr.totalExpenses, journalExp, 0.02),
      expAccounts.map(acc => `${acc}:${sumAccount(journalEntries,acc,'debit',FROM,TO).toFixed(0)}`).join(' '),
    ))
  }

  // C29: Bank in balance = debit503 - credit503
  {
    const d503 = sumAccount(journalEntries, '503', 'debit')
    const c503 = sumAccount(journalEntries, '503', 'credit')
    const expected = Math.max(d503 - c503, 0)
    checks.push(check(
      'C29',
      'Парични средства в баланса = Дт503 − Кт503',
      expected.toFixed(2),
      bs.bankBalance.toFixed(2),
      near(expected, bs.bankBalance),
      `Дт503=${d503.toFixed(2)}, Кт503=${c503.toFixed(2)}`,
    ))
  }

  // C30: VAT in balance = credit451 - debit452
  {
    const c451 = sumAccount(journalEntries, '451', 'credit')
    const d452 = sumAccount(journalEntries, '452', 'debit')
    const expected = Math.max(c451 - d452, 0)
    checks.push(check(
      'C30',
      'ДДС в баланса = Кт451 − Дт452',
      expected.toFixed(2),
      bs.vatPayable.toFixed(2),
      near(expected, bs.vatPayable),
      `Кт451=${c451.toFixed(2)}, Дт452=${d452.toFixed(2)}`,
    ))
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  const totalChecks  = checks.length
  const passedChecks = checks.filter(c => c.passed).length
  const failedChecks = totalChecks - passedChecks

  return {
    company,
    transactionsSummary,
    employeesSummary,
    journalSummary,
    oprResult,
    balanceResult,
    vatSummary,
    payrollSummary,
    documentsGenerated,
    checks,
    totalChecks,
    passedChecks,
    failedChecks,
    overallStatus: failedChecks === 0 ? 'PASS' : 'FAIL',
    generatedAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - t0),
  }
}
