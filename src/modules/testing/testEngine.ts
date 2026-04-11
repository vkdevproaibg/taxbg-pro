import { useAccountingStore } from '../../store/accountingStore'
import { useJournalStore } from '../../store/journalStore'
import { useEmployeesStore } from '../../store/employeesStore'
import { transactionToJournalEntry, createVatJournalEntry } from '../../lib/journalAI'
import type { TestScenario } from './testScenarios'
import type { TestResult } from './assertionEngine'
import { runAssertions } from './assertionEngine'

export type TestStatus = 'idle' | 'running' | 'done' | 'error'

export interface TestProgress {
  step: string
  current: number
  total: number
}

// IDs of test data — to clean up after
const TEST_TX_IDS:  string[] = []
const TEST_EMP_IDS: string[] = []

export async function runTestScenario(
  scenario: TestScenario,
  onProgress: (p: TestProgress) => void
): Promise<TestResult> {
  const startedAt = performance.now()
  TEST_TX_IDS.length  = 0
  TEST_EMP_IDS.length = 0

  const accounting    = useAccountingStore.getState()
  const journal       = useJournalStore.getState()
  const employeesStr  = useEmployeesStore.getState()

  // ── Step 1: Save original user data ──────────────────────────
  onProgress({ step: 'Сохранение данных...', current: 1, total: 6 })
  await sleep(100)

  // ── Step 2: Add employees ─────────────────────────────────────
  onProgress({ step: 'Добавление сотрудников...', current: 2, total: 6 })
  for (const emp of scenario.employees) {
    const empsBefore = useEmployeesStore.getState().employees.map(e => e.id)
    employeesStr.addEmployee(emp)
    const newEmp = useEmployeesStore.getState().employees.find(
      e => !empsBefore.includes(e.id)
    )
    if (newEmp) TEST_EMP_IDS.push(newEmp.id)
    await sleep(10)
  }

  // ── Step 3: Add transactions ──────────────────────────────────
  onProgress({ step: 'Создание транзакций...', current: 3, total: 6 })
  for (const tx of scenario.transactions) {
    const txsBefore = useAccountingStore.getState().transactions.map(t => t.id)
    accounting.addTransaction(tx)
    const newTx = useAccountingStore.getState().transactions.find(
      t => !txsBefore.includes(t.id)
    )
    if (newTx) TEST_TX_IDS.push(newTx.id)
    await sleep(5)
  }

  // ── Step 4: Create journal entries ────────────────────────────
  onProgress({ step: 'Создание проводок...', current: 4, total: 6 })
  const addedTxs = useAccountingStore.getState().transactions
    .filter(t => TEST_TX_IDS.includes(t.id))

  for (const tx of addedTxs) {
    const entry = transactionToJournalEntry(tx)
    if (entry) journal.addEntry(entry)
    const vatEntry = createVatJournalEntry(tx)
    if (vatEntry) journal.addEntry(vatEntry)
    await sleep(5)
  }

  // ── Step 5: Run assertions ────────────────────────────────────
  onProgress({ step: 'Проверка результатов...', current: 5, total: 6 })
  await sleep(200)

  const currentTxs  = useAccountingStore.getState().transactions
    .filter(t => TEST_TX_IDS.includes(t.id))
  const currentEnts = useJournalStore.getState().entries
  const currentEmps = useEmployeesStore.getState().employees
    .filter(e => TEST_EMP_IDS.includes(e.id))

  const assertions = runAssertions(
    scenario,
    currentTxs,
    currentEnts,
    currentEmps,
  )

  // ── Step 6: Cleanup ───────────────────────────────────────────
  onProgress({ step: 'Очистка тестовых данных...', current: 6, total: 6 })
  await sleep(200)

  useAccountingStore.setState({
    transactions: useAccountingStore.getState().transactions
      .filter(t => !TEST_TX_IDS.includes(t.id)),
  })

  useJournalStore.setState({
    entries: useJournalStore.getState().entries.filter(
      e => !TEST_TX_IDS.includes(e.linkedTransactionId ?? '')
    ),
  })

  useEmployeesStore.setState({
    employees: useEmployeesStore.getState().employees
      .filter(e => !TEST_EMP_IDS.includes(e.id)),
  })

  const duration  = Math.round(performance.now() - startedAt)
  const passCount = assertions.filter(a => a.status === 'pass').length
  const failCount = assertions.filter(a => a.status === 'fail').length
  const warnCount = assertions.filter(a => a.status === 'warning').length

  return {
    scenarioId: scenario.id,
    assertions,
    passCount,
    failCount,
    warnCount,
    duration,
    completedAt: new Date().toISOString(),
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
