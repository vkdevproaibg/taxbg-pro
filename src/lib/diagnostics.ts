import { useCompaniesStore } from '../store/companiesStore'
import { useAccountingStore } from '../store/accountingStore'
import { useEmployeesStore } from '../store/employeesStore'
import { useJournalStore } from '../store/journalStore'
import { useUserStore } from '../store/userStore'
import { useNotificationsStore } from '../store/notificationsStore'
import { CHART_OF_ACCOUNTS } from '../constants/chartOfAccounts'
import { buildBalanceSheet, buildOPR } from './financialReports'
import { getRateValue } from './taxRates'
import { getRecentErrors } from './errorCapture'
import { runHealthCheck, type HealthCheckResult } from './healthCheck'

export interface DiagnosticSnapshot {
  timestamp: string
  appVersion: string
  userLanguage: string
  viewMode: string
  browserInfo: string
  screenSize: string
  company: {
    id: string
    name: string
    legalForm: string
    hasVat: boolean
    hasEmployees: boolean
    eik: string
  } | null
  dataStats: {
    transactionsCount: number
    transactionsByType: Record<string, number>
    transactionsPeriod: { from: string; to: string } | null
    journalEntriesCount: number
    employeesCount: number
    companiesCount: number
  }
  financials: {
    totalIncome: number
    totalExpenses: number
    vatCollected: number
    vatDeductible: number
    bankBalance: number
    oprNetProfit: number
    balanceTotalAssets: number
    balanceTotalPassive: number
    balanceIsBalanced: boolean
    balanceDifference: number
  }
  accountBalances: Record<string, { debit: number; credit: number; balance: number }>
  currentRates: {
    corporateTax: number
    minWage: number
    maxOsig: number
    employerTotal: number
    employeeTotal: number
  }
  notifications: {
    total: number
    critical: number
    warning: number
  }
  riskEngineHealth: boolean
  consoleErrors: string[]
  healthCheck: HealthCheckResult | null
}

export async function collectDiagnostics(): Promise<DiagnosticSnapshot> {
  const userState = useUserStore.getState()
  const companiesState = useCompaniesStore.getState()
  const accountingState = useAccountingStore.getState()
  const employeesState = useEmployeesStore.getState()
  const journalState = useJournalStore.getState()
  const notificationsState = useNotificationsStore.getState()

  const activeCompany = companiesState.getActive()
  const now = new Date().toISOString()
  const yearStart = now.slice(0, 4) + '-01-01'
  const yearEnd = now.slice(0, 4) + '-12-31'

  // Transaction stats — no personal data
  const txs = accountingState.transactions
  const approvedTxs = txs.filter(t => !t.status || t.status === 'approved')
  const byType: Record<string, number> = {}
  for (const tx of approvedTxs) {
    byType[tx.type] = (byType[tx.type] ?? 0) + 1
  }

  const sortedDates = approvedTxs.map(t => t.date).sort()
  const txPeriod = sortedDates.length > 0
    ? { from: sortedDates[0], to: sortedDates[sortedDates.length - 1] }
    : null

  // Financial calculations
  const totalIncome = accountingState.getTotalIncome(yearStart, yearEnd)
  const totalExpenses = accountingState.getTotalExpenses(yearStart, yearEnd)
  const vatCollected = accountingState.getVatCollected(yearStart, yearEnd)
  const vatDeductible = accountingState.getVatDeductible(yearStart, yearEnd)

  // Journal entries for reports
  const entries = journalState.entries
  const companyName = activeCompany?.name ?? ''

  let oprNetProfit = 0
  try {
    const opr = buildOPR(entries, approvedTxs, yearStart, yearEnd, companyName)
    oprNetProfit = opr.netProfit
  } catch { /* non-fatal */ }

  let balanceTotalAssets = 0
  let balanceTotalPassive = 0
  let balanceIsBalanced = true
  let balanceDifference = 0
  try {
    const bs = buildBalanceSheet(entries, yearEnd, companyName, approvedTxs)
    balanceTotalAssets = bs.totalAssets
    balanceTotalPassive = bs.totalPassive
    balanceIsBalanced = bs.isBalanced
    balanceDifference = bs.difference
  } catch { /* non-fatal */ }

  // Account balances — aggregate only
  const accountBalances: Record<string, { debit: number; credit: number; balance: number }> = {}
  for (const acc of CHART_OF_ACCOUNTS) {
    let debit = 0
    let credit = 0
    for (const e of entries) {
      if (e.debitAccount === acc.code) debit += e.amount
      if (e.creditAccount === acc.code) credit += e.amount
    }
    if (debit > 0 || credit > 0) {
      accountBalances[acc.code] = { debit, credit, balance: debit - credit }
    }
  }

  // Notifications stats
  const activeNotifs = notificationsState.getActive()
  const critical = activeNotifs.filter(n => n.severity === 'critical').length
  const warning = activeNotifs.filter(n => n.severity === 'warning').length

  // Tax rates
  const today = now.slice(0, 10)
  let corporateTax = 0.10
  let minWage = 620.20
  let maxOsig = 2111.64
  let employerTotal = 0.2034
  let employeeTotal = 0.145
  try {
    corporateTax = getRateValue('corporateTax', today)
    minWage = getRateValue('minWage', today)
    maxOsig = getRateValue('maxOsig', today)
    employerTotal = getRateValue('employer.total', today)
    employeeTotal = getRateValue('employee.total', today)
  } catch { /* use defaults */ }

  // Health check — non-blocking
  let healthCheck: HealthCheckResult | null = null
  try {
    healthCheck = await runHealthCheck()
  } catch { /* non-fatal */ }

  return {
    timestamp: now,
    appVersion: '1.0.0',
    userLanguage: userState.language,
    viewMode: userState.viewMode,
    browserInfo: navigator.userAgent,
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    company: activeCompany ? {
      id: activeCompany.id,
      name: activeCompany.name,
      legalForm: activeCompany.legalForm,
      hasVat: activeCompany.hasVat,
      hasEmployees: activeCompany.hasEmployees,
      eik: activeCompany.eik,
    } : null,
    dataStats: {
      transactionsCount: approvedTxs.length,
      transactionsByType: byType,
      transactionsPeriod: txPeriod,
      journalEntriesCount: entries.length,
      employeesCount: employeesState.employees.length,
      companiesCount: companiesState.companies.length,
    },
    financials: {
      totalIncome,
      totalExpenses,
      vatCollected,
      vatDeductible,
      bankBalance: journalState.bankBalance,
      oprNetProfit,
      balanceTotalAssets,
      balanceTotalPassive,
      balanceIsBalanced,
      balanceDifference,
    },
    accountBalances,
    currentRates: {
      corporateTax,
      minWage,
      maxOsig,
      employerTotal,
      employeeTotal,
    },
    notifications: {
      total: activeNotifs.length,
      critical,
      warning,
    },
    riskEngineHealth: true, // placeholder — risk engine is always considered healthy for now
    consoleErrors: getRecentErrors(),
    healthCheck,
  }
}

export function exportDiagnosticsAsJson(snapshot: DiagnosticSnapshot): string {
  return JSON.stringify(snapshot, null, 2)
}

export function exportDiagnosticsAsCsv(snapshot: DiagnosticSnapshot): string {
  const lines: string[] = ['key,value']

  lines.push(`timestamp,${snapshot.timestamp}`)
  lines.push(`appVersion,${snapshot.appVersion}`)
  lines.push(`userLanguage,${snapshot.userLanguage}`)
  lines.push(`viewMode,${snapshot.viewMode}`)
  lines.push(`browserInfo,"${snapshot.browserInfo.replace(/"/g, '""')}"`)
  lines.push(`screenSize,${snapshot.screenSize}`)

  if (snapshot.company) {
    lines.push(`company.name,"${snapshot.company.name.replace(/"/g, '""')}"`)
    lines.push(`company.legalForm,${snapshot.company.legalForm}`)
    lines.push(`company.hasVat,${snapshot.company.hasVat}`)
    lines.push(`company.hasEmployees,${snapshot.company.hasEmployees}`)
    lines.push(`company.eik,${snapshot.company.eik}`)
  }

  lines.push(`dataStats.transactionsCount,${snapshot.dataStats.transactionsCount}`)
  lines.push(`dataStats.journalEntriesCount,${snapshot.dataStats.journalEntriesCount}`)
  lines.push(`dataStats.employeesCount,${snapshot.dataStats.employeesCount}`)
  lines.push(`dataStats.companiesCount,${snapshot.dataStats.companiesCount}`)

  const f = snapshot.financials
  lines.push(`financials.totalIncome,${f.totalIncome}`)
  lines.push(`financials.totalExpenses,${f.totalExpenses}`)
  lines.push(`financials.vatCollected,${f.vatCollected}`)
  lines.push(`financials.vatDeductible,${f.vatDeductible}`)
  lines.push(`financials.bankBalance,${f.bankBalance}`)
  lines.push(`financials.oprNetProfit,${f.oprNetProfit}`)
  lines.push(`financials.balanceTotalAssets,${f.balanceTotalAssets}`)
  lines.push(`financials.balanceTotalPassive,${f.balanceTotalPassive}`)
  lines.push(`financials.balanceIsBalanced,${f.balanceIsBalanced}`)
  lines.push(`financials.balanceDifference,${f.balanceDifference}`)

  for (const [code, bal] of Object.entries(snapshot.accountBalances)) {
    lines.push(`account.${code}.debit,${bal.debit}`)
    lines.push(`account.${code}.credit,${bal.credit}`)
    lines.push(`account.${code}.balance,${bal.balance}`)
  }

  lines.push(`notifications.total,${snapshot.notifications.total}`)
  lines.push(`notifications.critical,${snapshot.notifications.critical}`)
  lines.push(`notifications.warning,${snapshot.notifications.warning}`)

  for (const err of snapshot.consoleErrors) {
    lines.push(`consoleError,"${err.replace(/"/g, '""')}"`)
  }

  return lines.join('\n')
}
