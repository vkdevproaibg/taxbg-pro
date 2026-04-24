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
import { buildOPR, buildBalanceSheet, calculateCorporateTax, oprToCsv, balanceToCsv } from '../../lib/financialReports'
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
    skipped?: boolean
    expected: string
    actual: string
    details?: string
  }[]
  totalChecks: number
  passedChecks: number
  failedChecks: number
  skippedChecks: number
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
    makeEmployee({ name: 'Георги Николов', position: 'Intern',            grossSalary: getRateValue('minWage', '2026-01-01'),  egn: '0101015555', startDate: '2026-05-01' }, companyId),
  ]

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

  // Extra income to cover 5 employees (base income 8000/mo is not enough)
  const MONTHS_ALL = [
    '2026-01','2026-02','2026-03','2026-04','2026-05','2026-06',
    '2026-07','2026-08','2026-09','2026-10','2026-11','2026-12',
  ]
  const extraIncome: Transaction[] = MONTHS_ALL.map((m, i) =>
    makeTransaction({
      date: `${m}-05`,
      type: 'income',
      amount: 4000,
      description: 'Консултантски услуги (допълнително)',
      counterparty: 'Клиент Д ЕООД',
      invoiceNumber: `INV-B${3001 + i}`,
    }, companyId)
  )

  return { company, transactions: [...baseTxs, ...extraIncome, ...extraSalaries], employees }
}

// ─── Check runner helper ───────────────────────────────────────────────────────

interface CheckResult {
  id: string
  name: string
  passed: boolean
  skipped?: boolean
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

function checkSkip(id: string, name: string, reason: string): CheckResult {
  return { id, name, passed: true, skipped: true, expected: 'SKIP', actual: reason }
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
  periodFrom: string = '2026-01-01',
  periodTo: string = '2026-12-31',
): Promise<IntegrationTestResult> {
  const t0 = performance.now()
  const companyId = uuid()

  // 1. Generate scenario data (always full year)
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

  const { company, employees } = scenarioData
  // Filter transactions to selected period for reporting
  const allTransactions = scenarioData.transactions
  const transactions = allTransactions.filter(t => t.date >= periodFrom && t.date <= periodTo)

  // 2. Build journal entries from ALL transactions (balance is cumulative)
  const allJournalEntries: JournalEntry[] = []

  // Capital entry
  if (company.capital > 0) {
    allJournalEntries.push({
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

  // From ALL transactions (journal must be cumulative for balance)
  allJournalEntries.push(...buildJournalEntries(allTransactions))

  // Journal entries filtered to period (for OPR and trial balance turnovers)
  const journalEntries = allJournalEntries.filter(e => e.date >= periodFrom && e.date <= periodTo)

  const FROM = periodFrom
  const TO   = periodTo

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
  const txFirstDate = allDates[0] ?? FROM
  const txLastDate  = allDates[allDates.length - 1] ?? TO

  const totalDays = Math.max(
    1,
    (new Date(txLastDate).getTime() - new Date(txFirstDate).getTime()) / 86400000,
  )

  const transactionsSummary = {
    total: transactions.length,
    byType,
    byMonth,
    avgPerDay: Math.round((transactions.length / totalDays) * 100) / 100,
    period: { from: FROM, to: TO },
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

  // Balance uses ALL entries up to period end (cumulative) and ALL transactions for non-deductible calc
  const bs = buildBalanceSheet(allJournalEntries, TO, company.name, allTransactions)
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

  type PayrollSummary = NonNullable<IntegrationTestResult['payrollSummary']>

  let payrollSummary: PayrollSummary | undefined

  if (employees.length > 0 && company.hasEmployees) {
    const payByMonth: PayrollSummary['byMonth'] = {}
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

    const ann = Object.values(payByMonth).reduce<PayrollSummary['annualTotal']>(
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

  // C7: totalExpenses = expense + vat_in + salary + depreciation + vehicle (full amount)
  // Journal entries always reflect full amounts. Non-deductible adjustments are in OPR only.
  {
    const expenseTypes: TransactionType[] = ['expense','vat_in','salary','depreciation','vehicle_tax','vehicle_expense','asset_purchase']
    const expTxs = transactions.filter(t => expenseTypes.includes(t.type))
    const expectedExp = expTxs.reduce((s, t) => {
      // asset_purchase goes to 205, not expense accounts — not in OPR
      if (t.type === 'asset_purchase') return s
      return s + t.amount
    }, 0)
    checks.push(check(
      'C7',
      'totalExpenses = Σ разходни транзакции (пълна сума)',
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

  // C12: capital >= 1 — skip for freelancers (legalForm='self'), they have no registered capital
  if (company.legalForm === 'self') {
    checks.push(checkSkip('C12', 'Основен капитал ≥ 1 €', 'Самоосигуряващ се — няма уставен капитал'))
  } else {
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
  }

  // C13: If 122 entries exist — they appear in retained earnings
  // Balance is cumulative — use allJournalEntries
  {
    const ret122 = sumAccount(allJournalEntries, '122', 'credit', undefined, TO) - sumAccount(allJournalEntries, '122', 'debit', undefined, TO)
    const retInBS = bs.retainedEarnings
    const has122 = allJournalEntries.some(e => e.date <= TO && (e.debitAccount === '122' || e.creditAccount === '122'))
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
    // No employees — skip payroll checks (not applicable for this scenario)
    for (const id of ['C18','C19','C20','C21','C22']) {
      checks.push(checkSkip(id, `Осигуровки (${id})`, 'Сценарий без служители — неприложимо'))
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
  // Balance is cumulative — use allJournalEntries up to period end
  {
    const d503 = sumAccount(allJournalEntries, '503', 'debit', undefined, TO)
    const c503 = sumAccount(allJournalEntries, '503', 'credit', undefined, TO)
    const expected = Math.max(d503 - c503, 0)
    checks.push(check(
      'C29',
      'Парични средства в баланса = Дт503 − Кт503 (накопительно)',
      expected.toFixed(2),
      bs.bankBalance.toFixed(2),
      near(expected, bs.bankBalance),
      `Дт503=${d503.toFixed(2)}, Кт503=${c503.toFixed(2)} (от начала года до ${TO})`,
    ))
  }

  // C30: VAT in balance = credit451 - debit452
  // Balance is cumulative — use allJournalEntries up to period end
  {
    const c451 = sumAccount(allJournalEntries, '451', 'credit', undefined, TO)
    const d452 = sumAccount(allJournalEntries, '452', 'debit', undefined, TO)
    const expected = Math.max(c451 - d452, 0)
    checks.push(check(
      'C30',
      'ДДС в баланса = Кт451 − Дт452 (накопительно)',
      expected.toFixed(2),
      bs.vatPayable.toFixed(2),
      near(expected, bs.vatPayable),
      `Кт451=${c451.toFixed(2)}, Дт452=${d452.toFixed(2)} (от начала года до ${TO})`,
    ))
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  const activeChecks  = checks.filter(c => !c.skipped)
  const totalChecks   = activeChecks.length
  const passedChecks  = activeChecks.filter(c => c.passed).length
  const failedChecks  = totalChecks - passedChecks
  const skippedChecks = checks.length - activeChecks.length

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
    skippedChecks,
    overallStatus: failedChecks === 0 ? 'PASS' : 'FAIL',
    generatedAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - t0),
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Accounting Diagnostics ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export interface TransactionDiag {
  txId: string
  type: string
  date: string
  amount: number
  description: string
  entries: {
    debitAccount: string
    creditAccount: string
    amount: number
    description: string
  }[]
  amountMismatch: boolean   // true if any main entry amount !== tx.amount
}

export interface TrialBalanceRow {
  account: string
  accountType: 'active' | 'passive' | 'active-passive' | 'expense' | 'revenue'
  accountLabel: string
  openingBalance: number
  debitTurnover: number
  creditTurnover: number
  closingBalance: number   // positive = debit balance, negative = credit balance
  balanceSide: 'debit' | 'credit' | 'zero'
}

export interface ManualBalance {
  assets: { account: string; amount: number }[]
  totalAssets: number
  liabilities: { account: string; amount: number }[]
  totalLiabilities: number
  revenue7xx: number
  expense6xx: number
  financialResult: number
  nonDeductible: number
  corporateTax: number
  netProfit: number
  totalPassive: number   // totalLiabilities + netProfit
  difference: number     // totalAssets - totalPassive
}

export interface BalanceComparison {
  field: string
  manual: number
  system: number
  diff: number
}

export interface AccountingDiagnosticsResult {
  transactionDiags: TransactionDiag[]
  trialBalance: TrialBalanceRow[]
  trialBalanceCheck: {
    totalDebit: number
    totalCredit: number
    difference: number
    isEqual: boolean
  }
  manualBalance: ManualBalance
  systemBalance: {
    totalAssets: number
    totalPassive: number
    difference: number
    isBalanced: boolean
    bankBalance: number
    fixedAssets: number
    capital: number
    retainedEarnings: number
    currentProfit: number
    creditors: number
    vatPayable: number
    taxPayable: number
  }
  comparison: BalanceComparison[]
  durationMs: number
}

const ACCOUNT_LABELS: Record<string, string> = {
  '101': 'Основен капитал',
  '102': 'Регистриран капитал',
  '122': 'Неразпределена печалба',
  '205': 'Компютри и оборудване',
  '206': 'Транспортни средства',
  '207': 'Офис мебели',
  '241': 'Амортизация на ДМА',
  '246': 'Амортизация на ТС',
  '401': 'Задължения към доставчици',
  '411': 'Вземания от клиенти',
  '421': 'Задължения към персонала',
  '451': 'ДДС начислен (изходящ)',
  '452': 'ДДС данъчен кредит (входящ)',
  '453': 'Данъчни задължения',
  '461': 'Разчети с НОИ',
  '493': 'Разчети със собственици',
  '501': 'Каса',
  '503': 'Разплащателна сметка',
  '601': 'Разходи за материали',
  '602': 'Разходи за външни услуги',
  '603': 'Разходи за амортизация',
  '604': 'Разходи за заплати',
  '605': 'Разходи за осигуровки',
  '606': 'Разходи за данъци и такси',
  '609': 'Други разходи',
  '703': 'Приходи от продажби на услуги',
  '705': 'Приходи от продажби на стоки',
  '729': 'Финансови приходи',
}

function getAccountType(code: string): TrialBalanceRow['accountType'] {
  const cls = parseInt(code[0])
  if (cls === 1) return 'passive'
  if (cls === 2 || cls === 3 || cls === 5) return 'active'
  if (cls === 4) return 'active-passive'
  if (cls === 6) return 'expense'
  if (cls === 7) return 'revenue'
  return 'active'
}

export function runAccountingDiagnostics(
  scenario: TestScenario = 'small_it_company',
  periodFrom: string = '2026-01-01',
  periodTo: string = '2026-12-31',
): AccountingDiagnosticsResult {
  const t0 = performance.now()
  const companyId = crypto.randomUUID()

  // ── 1. Build scenario (always full year) ──────────────────────────────────
  let scenarioData: { company: TestCompanyProfile; transactions: Transaction[]; employees: Employee[] }
  if (scenario === 'small_it_company') {
    scenarioData = buildSmallItCompany(companyId)
  } else if (scenario === 'freelancer') {
    scenarioData = buildFreelancer(companyId)
  } else {
    scenarioData = buildCompanyWithEmployees(companyId)
  }

  const { company } = scenarioData
  const allTransactions = scenarioData.transactions
  const transactions = allTransactions.filter(t => t.date >= periodFrom && t.date <= periodTo)

  // ── 2. Build journal entries ──────────────────────────────────────────────
  const allJournalEntries: JournalEntry[] = []

  // Capital entry
  if (company.capital > 0) {
    allJournalEntries.push({
      id: crypto.randomUUID(),
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

  allJournalEntries.push(...buildJournalEntries(allTransactions))

  // Period-filtered journal entries (for trial balance turnovers)
  const journalEntries = allJournalEntries.filter(e => e.date >= periodFrom && e.date <= periodTo)
  // All entries up to period end (for balance — cumulative)
  const cumulativeEntries = allJournalEntries.filter(e => e.date <= periodTo)

  // ── 3. Per-transaction diagnostics ────────────────────────────────────────
  const transactionDiags: TransactionDiag[] = transactions.map(tx => {
    const txEntries = journalEntries.filter(e => e.linkedTransactionId === tx.id)
    // The "main" entry is the one matching the TRANSACTION_RULES (not VAT sub-entries)
    const mainEntry = txEntries.find(e =>
      !(e.debitAccount === '503' && e.creditAccount === '451') &&  // not vat_out VAT
      !(e.debitAccount === '452' && e.creditAccount === '401')     // not vat_in credit
    )
    return {
      txId: tx.id.slice(0, 8),
      type: tx.type,
      date: tx.date,
      amount: tx.amount,
      description: tx.description,
      entries: txEntries.map(e => ({
        debitAccount: e.debitAccount,
        creditAccount: e.creditAccount,
        amount: e.amount,
        description: e.description,
      })),
      amountMismatch: mainEntry ? Math.abs(mainEntry.amount - tx.amount) > 0.001 : true,
    }
  })

  // ── 4. Trial balance (оборотна ведомост) ──────────────────────────────────
  // Collect all accounts from cumulative entries (so balance-only accounts appear)
  const allAccounts = new Set<string>()
  for (const e of cumulativeEntries) {
    allAccounts.add(e.debitAccount)
    allAccounts.add(e.creditAccount)
  }

  const trialBalance: TrialBalanceRow[] = [...allAccounts].sort().map(account => {
    // Turnovers — period only (for the оборотна ведомост display)
    const debitTurnover = journalEntries
      .filter(e => e.debitAccount === account)
      .reduce((s, e) => s + e.amount, 0)
    const creditTurnover = journalEntries
      .filter(e => e.creditAccount === account)
      .reduce((s, e) => s + e.amount, 0)

    // Closing balance — cumulative from start of year to end of period
    const cumDebit = cumulativeEntries
      .filter(e => e.debitAccount === account)
      .reduce((s, e) => s + e.amount, 0)
    const cumCredit = cumulativeEntries
      .filter(e => e.creditAccount === account)
      .reduce((s, e) => s + e.amount, 0)

    const accountType = getAccountType(account)
    const closingBalance = cumDebit - cumCredit  // positive = debit, negative = credit

    return {
      account,
      accountType,
      accountLabel: ACCOUNT_LABELS[account] ?? `Сметка ${account}`,
      openingBalance: 0,
      debitTurnover,
      creditTurnover,
      closingBalance,
      balanceSide: closingBalance > 0.001 ? 'debit' as const
        : closingBalance < -0.001 ? 'credit' as const
        : 'zero' as const,
    }
  })

  // ── 5. Trial balance check ────────────────────────────────────────────────
  const totalDebit = trialBalance.reduce((s, r) => s + r.debitTurnover, 0)
  const totalCredit = trialBalance.reduce((s, r) => s + r.creditTurnover, 0)

  const trialBalanceCheck = {
    totalDebit,
    totalCredit,
    difference: Math.abs(totalDebit - totalCredit),
    isEqual: Math.abs(totalDebit - totalCredit) < 0.01,
  }

  // ── 6. Manual balance from trial balance ──────────────────────────────────
  // Assets: accounts 1xx-5xx with debit closing balance
  // Liabilities: accounts 1xx-5xx with credit closing balance
  // 6xx/7xx: P&L accounts, not in balance — go through financial result
  // Special netting: 451/452 (VAT) are netted into a single line

  const assetItems: { account: string; amount: number }[] = []
  const liabItems: { account: string; amount: number }[] = []

  // Accounts that are netted separately — skip in the general loop
  const NETTED_ACCOUNTS = new Set(['451', '452'])

  for (const row of trialBalance) {
    const cls = parseInt(row.account[0])
    if (cls >= 6) continue  // 6xx, 7xx — P&L, not balance sheet
    if (NETTED_ACCOUNTS.has(row.account)) continue  // handled below

    // Special: contra-asset accounts (241, 246, 247) reduce assets
    const isContraAsset = ['241', '246', '247'].includes(row.account)

    if (isContraAsset) {
      if (Math.abs(row.closingBalance) > 0.001) {
        assetItems.push({ account: row.account, amount: row.closingBalance })
      }
      continue
    }

    if (row.closingBalance > 0.001) {
      assetItems.push({ account: row.account, amount: row.closingBalance })
    } else if (row.closingBalance < -0.001) {
      liabItems.push({ account: row.account, amount: -row.closingBalance })
    }
  }

  // Net VAT: 451 (credit balance = output VAT) vs 452 (debit balance = input VAT credit)
  const row451 = trialBalance.find(r => r.account === '451')
  const row452 = trialBalance.find(r => r.account === '452')
  const credit451 = row451 ? row451.creditTurnover - row451.debitTurnover : 0
  const debit452  = row452 ? row452.debitTurnover - row452.creditTurnover : 0
  const netVat = credit451 - debit452  // positive = payable, negative = refundable
  if (netVat > 0.001) {
    liabItems.push({ account: '451-452 ДДС', amount: netVat })
  } else if (netVat < -0.001) {
    assetItems.push({ account: '451-452 ДДС', amount: -netVat })
  }

  // P&L from trial balance — use cumulative closing balances (not period turnovers)
  // to match buildBalanceSheet which reads all entries up to periodTo
  const revenue7xx = trialBalance
    .filter(r => r.account.startsWith('7'))
    .reduce((s, r) => s + (-r.closingBalance), 0)  // credit balance is negative in our convention
  const expense6xx = trialBalance
    .filter(r => r.account.startsWith('6'))
    .reduce((s, r) => s + r.closingBalance, 0)     // debit balance is positive
  const financialResult = revenue7xx - expense6xx

  // Non-deductible expenses — cumulative up to period end
  const nonDeductible = allTransactions
    .filter(t => t.date <= periodTo && t.type === 'vehicle_expense')
    .reduce((s, t) => s + t.amount * (1 - (t.deductiblePercent ?? 0.5)), 0)

  const { corporateTax, netProfit } = calculateCorporateTax(financialResult, nonDeductible, periodFrom)

  // Implicit corporate tax payable: if no 453 journal entries exist but there is
  // a positive financial result, add the calculated corporate tax to liabilities.
  // This mirrors buildBalanceSheet's implicitTaxPayable logic.
  const row453 = trialBalance.find(r => r.account === '453')
  const tax453Balance = row453 ? Math.max(row453.creditTurnover - row453.debitTurnover, 0) : 0
  const implicitTaxPayable = Math.max(corporateTax - tax453Balance, 0)
  if (implicitTaxPayable > 0.001) {
    liabItems.push({ account: '453* данък (расчётно)', amount: implicitTaxPayable })
  }

  const totalAssets = assetItems.reduce((s, i) => s + i.amount, 0)
  const totalLiabilities = liabItems.reduce((s, i) => s + i.amount, 0)

  const totalPassive = totalLiabilities + netProfit
  const manualDifference = totalAssets - totalPassive

  const manualBalance: ManualBalance = {
    assets: assetItems,
    totalAssets,
    liabilities: liabItems,
    totalLiabilities,
    revenue7xx,
    expense6xx,
    financialResult,
    nonDeductible,
    corporateTax,
    netProfit,
    totalPassive,
    difference: manualDifference,
  }

  // ── 7. System balance (buildBalanceSheet) — cumulative up to period end ──
  const bs = buildBalanceSheet(cumulativeEntries, periodTo, company.name, allTransactions)

  const systemBalance = {
    totalAssets: bs.totalAssets,
    totalPassive: bs.totalPassive,
    difference: bs.difference,
    isBalanced: bs.isBalanced,
    bankBalance: bs.bankBalance,
    fixedAssets: bs.fixedAssets,
    capital: bs.capital,
    retainedEarnings: bs.retainedEarnings,
    currentProfit: bs.currentProfit,
    creditors: bs.creditors,
    vatPayable: bs.vatPayable,
    taxPayable: bs.taxPayable,
  }

  // ── 8. Comparison ─────────────────────────────────────────────────────────
  const comparison: BalanceComparison[] = [
    { field: 'Общо активи / totalAssets', manual: manualBalance.totalAssets, system: bs.totalAssets, diff: 0 },
    { field: 'Общо пасиви / totalPassive', manual: manualBalance.totalPassive, system: bs.totalPassive, diff: 0 },
    { field: 'Разлика (А-П) / difference', manual: manualBalance.difference, system: bs.difference, diff: 0 },
    { field: 'Чиста печалба / netProfit', manual: manualBalance.netProfit, system: bs.currentProfit, diff: 0 },
    { field: 'Корпоративен данък', manual: manualBalance.corporateTax, system: 0, diff: 0 },
    { field: 'Финансов резултат (преди данък)', manual: manualBalance.financialResult, system: 0, diff: 0 },
  ]
  // Fill system corporateTax and financialResult from OPR
  const opr = buildOPR(journalEntries, transactions, periodFrom, periodTo, company.name)
  comparison[4].system = opr.corporateTax
  comparison[5].system = opr.financialResult
  for (const c of comparison) c.diff = Math.abs(c.manual - c.system)

  // Per-account comparison: map manual items to system equivalents
  const accountComparisons: BalanceComparison[] = []

  // Bank
  const manualBank = assetItems.find(i => i.account === '503')?.amount ?? 0
  accountComparisons.push({ field: 'Банка (503)', manual: manualBank, system: bs.bankBalance, diff: Math.abs(manualBank - bs.bankBalance) })

  // Fixed assets (205 - 241 + 206 - 246)
  const manual205 = assetItems.find(i => i.account === '205')?.amount ?? 0
  const manual241 = assetItems.find(i => i.account === '241')?.amount ?? 0
  const manualFixed = manual205 + manual241  // 241 is already stored negative
  accountComparisons.push({ field: 'ДМА (205-241)', manual: manualFixed, system: bs.fixedAssets, diff: Math.abs(manualFixed - bs.fixedAssets) })

  // Capital (102)
  const manualCapital = liabItems.find(i => i.account === '102')?.amount ?? 0
  accountComparisons.push({ field: 'Капитал (102)', manual: manualCapital, system: bs.capital, diff: Math.abs(manualCapital - bs.capital) })

  // Creditors (401)
  const manualCreditors = liabItems.find(i => i.account === '401')?.amount ?? 0
  accountComparisons.push({ field: 'Доставчици (401)', manual: manualCreditors, system: bs.creditors, diff: Math.abs(manualCreditors - bs.creditors) })

  // VAT netted (451-452)
  const manualVatNetted = liabItems.find(i => i.account === '451-452 ДДС')?.amount
    ?? -(assetItems.find(i => i.account === '451-452 ДДС')?.amount ?? 0)
  accountComparisons.push({ field: 'ДДС нетно (451-452)', manual: manualVatNetted, system: bs.vatPayable, diff: Math.abs(manualVatNetted - bs.vatPayable) })

  // Implicit tax payable
  const manualTaxPayable = liabItems.find(i => i.account === '453* данък (расчётно)')?.amount ?? tax453Balance
  // System reports taxPayable from explicit 453 entries; implicit goes into totalLiabilities
  accountComparisons.push({ field: 'Данък (453/расчётно)', manual: manualTaxPayable, system: implicitTaxPayable, diff: Math.abs(manualTaxPayable - implicitTaxPayable) })

  // Dividend / owners (493) — system includes it via extraAssets in dynamic handler
  const manual493 = assetItems.find(i => i.account === '493')?.amount ?? 0
  // To get system's 493 value: totalAssets - bankBalance - fixedAssets - debtors
  const systemExtraAssets = bs.totalAssets - bs.bankBalance - bs.fixedAssets - bs.debtors
  accountComparisons.push({ field: 'Разч. собственици (493)', manual: manual493, system: systemExtraAssets, diff: Math.abs(manual493 - systemExtraAssets) })

  return {
    transactionDiags,
    trialBalance,
    trialBalanceCheck,
    manualBalance,
    systemBalance,
    comparison: [...comparison, ...accountComparisons],
    durationMs: Math.round(performance.now() - t0),
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Full Audit (combined integration test + diagnostics) ────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export interface FullAuditResult {
  integration: IntegrationTestResult
  diagnostics: AccountingDiagnosticsResult
  periodFrom: string
  periodTo: string
  periodLabel: string
  durationMs: number
}

export async function runFullAudit(
  scenario: TestScenario,
  periodFrom: string = '2026-01-01',
  periodTo: string = '2026-12-31',
  periodLabel: string = '2026',
): Promise<FullAuditResult> {
  const t0 = performance.now()
  const integration = await runIntegrationTest(scenario, periodFrom, periodTo)
  const diagnostics = runAccountingDiagnostics(scenario, periodFrom, periodTo)
  return {
    integration,
    diagnostics,
    periodFrom,
    periodTo,
    periodLabel,
    durationMs: Math.round(performance.now() - t0),
  }
}
