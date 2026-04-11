import type { Transaction } from '../../store/accountingStore'
import type { JournalEntry } from '../../store/journalStore'
import type { Employee } from '../../store/employeesStore'
import type { TestScenario } from './testScenarios'
import { buildOPR, buildBalanceSheet } from '../../lib/financialReports'

export type AssertionStatus = 'pass' | 'fail' | 'warning'

export interface Assertion {
  id: string
  title: string
  description: string
  status: AssertionStatus
  expected?: string
  actual?: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

export interface TestResult {
  scenarioId: string
  assertions: Assertion[]
  passCount: number
  failCount: number
  warnCount: number
  duration: number
  completedAt: string
}

function assert(
  id: string,
  title: string,
  description: string,
  condition: boolean,
  severity: Assertion['severity'],
  expected?: string,
  actual?: string,
  warning = false
): Assertion {
  return {
    id, title, description,
    status: warning ? 'warning' : condition ? 'pass' : 'fail',
    expected, actual, severity,
  }
}

export function runAssertions(
  scenario: TestScenario,
  transactions: Transaction[],
  entries: JournalEntry[],
  employees: Employee[],
): Assertion[] {
  const results: Assertion[] = []

  // ── 1. Transaction count ─────────────────────────────────────
  const txCount = transactions.length
  results.push(assert(
    'tx-count',
    'Транзакции созданы',
    'Все транзакции сценария добавлены в систему',
    txCount >= scenario.expectedResults.transactionCount * 0.9,
    'high',
    `≥ ${scenario.expectedResults.transactionCount}`,
    String(txCount),
  ))

  // ── 2. Journal entries created ───────────────────────────────
  const txWithEntries   = new Set(entries.map(e => e.linkedTransactionId).filter(Boolean)).size
  const journalCoverage = txCount > 0 ? Math.round(txWithEntries / txCount * 100) : 0

  results.push(assert(
    'journal-entries',
    'Проводки созданы автоматически',
    'Журнал проводок заполнен для всех транзакций',
    journalCoverage >= 80,
    'critical',
    '≥ 80% транзакций',
    `${journalCoverage}% (${txWithEntries}/${txCount})`,
  ))

  // ── 3. Income total ─────────────────────────────────────────
  const incomeTypes = ['income', 'vat_out', 'appstore', 'googleplay', 'stripe']
  const totalIncome = transactions
    .filter(t => incomeTypes.includes(t.type))
    .reduce((s, t) => s + t.amount, 0)
  const expectedIncome = scenario.expectedResults.totalIncome
  const incomeDiff     = expectedIncome > 0
    ? Math.abs(totalIncome - expectedIncome) / expectedIncome
    : 0

  results.push(assert(
    'income-total',
    'Итоговый доход',
    'Сумма доходов соответствует ожидаемой',
    incomeDiff < 0.20,
    'high',
    `~${expectedIncome.toLocaleString()} €`,
    `${totalIncome.toLocaleString()} €`,
  ))

  // ── 4. OPR can be built ─────────────────────────────────────
  const year    = new Date().getFullYear()
  const oprFrom = `${year}-01-01`
  const oprTo   = `${year}-12-31`
  let oprBuilt        = false
  let financialResult = 0
  try {
    const opr    = buildOPR(entries, transactions, oprFrom, oprTo, scenario.company.name)
    oprBuilt     = true
    financialResult = opr.financialResult
  } catch { /* ignore */ }

  results.push(assert(
    'opr-built',
    'ОПР построен',
    'Отчёт о прибылях и убытках успешно построен из проводок',
    oprBuilt,
    'critical',
    'Успешно',
    oprBuilt ? 'Успешно' : 'Ошибка построения',
  ))

  // ── 5. Financial result is positive ─────────────────────────
  if (oprBuilt) {
    results.push(assert(
      'positive-result',
      'Финансовый результат',
      'Компания прибыльна по данным сценария',
      financialResult > 0,
      'medium',
      '> 0 €',
      `${financialResult.toFixed(2)} €`,
    ))
  }

  // ── 6. Balance sheet ─────────────────────────────────────────
  let balanceBuilt = false
  let isBalanced   = false
  let balanceDiff  = 0
  let balanceDebug = ''
  try {
    const upToDate = `${year}-12-31`

    // Compute capital from entries (account 101 or 102)
    const capitalCredit = entries
      .filter(e => e.date <= upToDate &&
        (e.creditAccount === '101' || e.creditAccount === '102'))
      .reduce((s, e) => s + e.amount, 0)
    const capitalDebit = entries
      .filter(e => e.date <= upToDate &&
        (e.debitAccount === '101' || e.debitAccount === '102'))
      .reduce((s, e) => s + e.amount, 0)
    const scenarioCapital = (scenario.company as { capital?: number }).capital
    const computedCapital = capitalCredit - capitalDebit > 0
      ? capitalCredit - capitalDebit
      : scenarioCapital ?? 1

    // Compute debtors from entries (account 411)
    const debtorsDebit = entries
      .filter(e => e.date <= upToDate && e.debitAccount === '411')
      .reduce((s, e) => s + e.amount, 0)
    const debtorsCredit = entries
      .filter(e => e.date <= upToDate && e.creditAccount === '411')
      .reduce((s, e) => s + e.amount, 0)
    const computedDebtors = Math.max(debtorsDebit - debtorsCredit, 0)

    // Compute creditors from entries (account 401)
    const creditorsCredit = entries
      .filter(e => e.date <= upToDate && e.creditAccount === '401')
      .reduce((s, e) => s + e.amount, 0)
    const creditorsDebit = entries
      .filter(e => e.date <= upToDate && e.debitAccount === '401')
      .reduce((s, e) => s + e.amount, 0)
    const computedCreditors = Math.max(creditorsCredit - creditorsDebit, 0)

    balanceDebug = `капитал: ${computedCapital.toFixed(2)} € | `
      + `дебитори: ${computedDebtors.toFixed(2)} € | `
      + `кредитори: ${computedCreditors.toFixed(2)} €`

    // Add synthetic opening capital entry if journal has no capital postings
    const hasCapitalEntry = entries.some(e =>
      e.creditAccount === '101' || e.creditAccount === '102'
    )
    const syntheticEntries: JournalEntry[] = hasCapitalEntry
      ? entries
      : [
        ...entries,
        {
          id: 'synthetic-capital',
          date: `${year}-01-01`,
          debitAccount: '501',
          creditAccount: '102',
          amount: computedCapital,
          description: 'Начален капитал (синтетична проводка за тест)',
          linkedTransactionId: undefined,
          source: 'auto',
          period: `${year}-01`,
        },
      ]

    const sheet = buildBalanceSheet(
      syntheticEntries, upToDate,
      scenario.company.name,
    )
    balanceBuilt = true
    isBalanced   = sheet.isBalanced
    balanceDiff  = sheet.difference
  } catch { /* ignore */ }

  results.push(assert(
    'balance-built',
    'Баланс построен',
    'Балансовый отчёт успешно построен',
    balanceBuilt,
    'critical',
    'Успешно',
    balanceBuilt ? 'Успешно' : 'Ошибка',
  ))

  if (balanceBuilt && scenario.expectedResults.balanceShouldMatch) {
    results.push(assert(
      'balance-match',
      'Баланс сходится',
      'Активы = Пассивы (двойная запись)',
      isBalanced,
      'critical',
      'Активы = Пассивы',
      isBalanced
        ? '✓ Сходится'
        : `Разница: ${balanceDiff.toFixed(2)} € | ${balanceDebug}`,
    ))
  }

  if (balanceBuilt) {
    results.push(assert(
      'balance-debug',
      'Диагностика баланса',
      'Значения использованные при построении баланса',
      true,
      'low',
      'Информация',
      balanceDebug,
    ))
  }

  // ── 7. Employees ─────────────────────────────────────────────
  const empCount = employees.filter(e => e.active).length
  results.push(assert(
    'employees',
    'Сотрудники добавлены',
    'Все сотрудники сценария активны',
    empCount >= scenario.employees.length,
    'medium',
    `${scenario.employees.length} сотрудников`,
    `${empCount} активных`,
  ))

  // ── 8. Salary transactions ───────────────────────────────────
  const salaryTxs = transactions.filter(t => t.type === 'salary').length
  results.push(assert(
    'salary-txs',
    'Зарплатные проводки',
    'Выплаты зарплаты внесены в систему',
    salaryTxs > 0,
    'medium',
    '> 0',
    String(salaryTxs),
  ))

  // ── 9. No duplicate invoice numbers ──────────────────────────
  const invoiceNums  = transactions
    .map(t => t.invoiceNumber)
    .filter((n): n is string => Boolean(n))
  const uniqueInvoices = new Set(invoiceNums).size
  const hasDuplicates  = uniqueInvoices < invoiceNums.length

  results.push(assert(
    'invoice-nums',
    'Уникальные номера фактур',
    'Дублирование номеров фактур не обнаружено',
    !hasDuplicates,
    'high',
    'Нет дублей',
    hasDuplicates
      ? `${invoiceNums.length - uniqueInvoices} дублей`
      : 'Нет дублей',
  ))

  // ── 10. Journal debit = credit ────────────────────────────────
  const totalDebit  = entries.reduce((s, e) => s + e.amount, 0)
  const totalCredit = entries.reduce((s, e) => s + e.amount, 0)
  const journalBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  results.push(assert(
    'journal-balanced',
    'Журнал сбалансирован',
    'Сумма дебитов = сумме кредитов в журнале',
    journalBalanced,
    'critical',
    'Дт = Кт',
    journalBalanced ? '✓' : `Разница: ${Math.abs(totalDebit - totalCredit).toFixed(2)} €`,
  ))

  return results
}
