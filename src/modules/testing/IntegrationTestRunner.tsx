import { useState } from 'react'
import { useUserStore } from '../../store/userStore'
import { runIntegrationTest, type IntegrationTestResult, type TestScenario } from './integrationTest'

// ─── i18n ─────────────────────────────────────────────────────────────────────

const T = {
  ru: {
    title: 'Интеграционный тест',
    subtitle: 'Полная проверка: проводки, ОПР, баланс, ДДС, осигуровки, документы',
    selectScenario: 'Выберите сценарий',
    scenarios: {
      small_it_company:       'Малая IT компания (ООД, ДДС, 2 сотрудника)',
      freelancer:             'Самоосигуряващ се (без ДДС, без сотрудников)',
      company_with_employees: 'Компания с 5 сотрудниками (1 уволен)',
    },
    runTest: 'Запустить тест',
    running: 'Выполняется...',
    // sections
    secInput:       'Входные данные',
    secJournal:     'Проводки',
    secOPR:         'ОПР (Отчёт о прибылях и убытках)',
    secBalance:     'Баланс',
    secVAT:         'ДДС',
    secPayroll:     'Осигуровки',
    secDocuments:   'Документы',
    secChecks:      'Проверки',
    // company
    company:        'Компания',
    eik:            'ЕИК',
    legalForm:      'Правна форма',
    // tx summary
    transactions:   'Транзакции',
    period:         'Период',
    total:          'Всего',
    avgPerDay:      'Сред. в день',
    type:           'Тип',
    count:          'Кол-во',
    totalAmount:    'Сумма €',
    month:          'Месяц',
    income:         'Приход',
    expense:        'Расход',
    operations:     'Операций',
    // employees
    employees:      'Сотрудники',
    totalEmp:       'Всего',
    totalGross:     'Суммарный брутто €',
    avgSalary:      'Средняя зарплата €',
    // journal
    totalEntries:   'Всего записей',
    account:        'Счёт',
    debit:          'Дебит',
    credit:         'Кредит',
    balance:        'Сальдо',
    problems:       'Проблемы',
    noProblems:     'Нет проблем',
    // opr
    totalRevenue:   'Итого доходы',
    totalExpenses:  'Итого расходы',
    financialResult:'Финансовый результат',
    nonDeductible:  'Непризнаваемые расходы',
    taxableProfit:  'Налоговая прибыль',
    corporateTax:   'Корпоративный налог (10%)',
    netProfit:      'Чистая прибыль',
    // balance
    totalAssets:    'Итого активы',
    totalPassive:   'Итого пассивы',
    balanced:       'БАЛАНС СХОДИТСЯ',
    notBalanced:    'БАЛАНС НЕ СХОДИТСЯ',
    difference:     'Разница',
    bankBalance:    'Банк (сч.503)',
    fixedAssets:    'Основные средства',
    debtors:        'Дебиторы (сч.411)',
    capital:        'Капитал (сч.102)',
    retainedEarnings:'Нераспред. прибыль (сч.122)',
    currentProfit:  'Текущая прибыль',
    creditors:      'Кредиторы (сч.401)',
    vatPayable:     'ДДС за внасяне (сч.451)',
    salaryPayable:  'Задълж. персонал (сч.421)',
    taxPayable:     'Данъчни задълж. (сч.453)',
    // vat
    vatCollected:   'Начислен ДДС',
    vatDeductible:  'Данъчен кредит',
    vatDue:         'За внасяне',
    // payroll
    gross:          'Брутто',
    erContrib:      'Работодател',
    eeContrib:      'Работник',
    incomeTax:      'ДДФЛ',
    net:            'Нетто',
    totalCost:      'Общ разход',
    annualTotal:    'Годишен итог',
    // documents
    docType:        'Документ',
    docPeriod:      'Период',
    docStatus:      'Статус',
    docSize:        'Размер',
    // checks
    checkId:        'ID',
    checkName:      'Проверка',
    expected:       'Ожидаемо',
    actual:         'Фактично',
    details:        'Детали',
    // result
    overallPass:    'PASS — ВСЕ ПРОВЕРКИ ПРОШЛИ',
    overallFail:    'FAIL — ЕСТЬ ОШИБКИ',
    checksOf:       'из',
    passed:         'пройдено',
    // export
    downloadJson:   'Скачать отчёт (JSON)',
    downloadCsv:    'Скачать проверки (CSV)',
    durationMs:     'Время выполнения',
    ms:             'мс',
  },
  en: {
    title: 'Integration Test',
    subtitle: 'Full validation: journal entries, P&L, balance sheet, VAT, payroll, documents',
    selectScenario: 'Select scenario',
    scenarios: {
      small_it_company:       'Small IT company (OOD, VAT, 2 employees)',
      freelancer:             'Freelancer / self-employed (no VAT)',
      company_with_employees: 'Company with 5 employees (1 terminated)',
    },
    runTest: 'Run Test',
    running: 'Running...',
    secInput:       'Input data',
    secJournal:     'Journal entries',
    secOPR:         'P&L Statement',
    secBalance:     'Balance Sheet',
    secVAT:         'VAT',
    secPayroll:     'Payroll',
    secDocuments:   'Documents',
    secChecks:      'Checks',
    company:        'Company',
    eik:            'EIK',
    legalForm:      'Legal form',
    transactions:   'Transactions',
    period:         'Period',
    total:          'Total',
    avgPerDay:      'Avg / day',
    type:           'Type',
    count:          'Count',
    totalAmount:    'Amount €',
    month:          'Month',
    income:         'Income',
    expense:        'Expense',
    operations:     'Operations',
    employees:      'Employees',
    totalEmp:       'Total',
    totalGross:     'Total gross €',
    avgSalary:      'Avg salary €',
    totalEntries:   'Total entries',
    account:        'Account',
    debit:          'Debit',
    credit:         'Credit',
    balance:        'Balance',
    problems:       'Problems',
    noProblems:     'No problems',
    totalRevenue:   'Total revenue',
    totalExpenses:  'Total expenses',
    financialResult:'Financial result',
    nonDeductible:  'Non-deductible expenses',
    taxableProfit:  'Taxable profit',
    corporateTax:   'Corporate tax (10%)',
    netProfit:      'Net profit',
    totalAssets:    'Total assets',
    totalPassive:   'Total liabilities + equity',
    balanced:       'BALANCE CHECKS OUT',
    notBalanced:    'BALANCE DOES NOT CHECK OUT',
    difference:     'Difference',
    bankBalance:    'Bank (acc.503)',
    fixedAssets:    'Fixed assets',
    debtors:        'Debtors (acc.411)',
    capital:        'Capital (acc.102)',
    retainedEarnings:'Retained earnings (acc.122)',
    currentProfit:  'Current profit',
    creditors:      'Creditors (acc.401)',
    vatPayable:     'VAT payable (acc.451)',
    salaryPayable:  'Salary payable (acc.421)',
    taxPayable:     'Tax payable (acc.453)',
    vatCollected:   'VAT collected',
    vatDeductible:  'VAT credit',
    vatDue:         'VAT due',
    gross:          'Gross',
    erContrib:      'Employer',
    eeContrib:      'Employee',
    incomeTax:      'Income tax',
    net:            'Net',
    totalCost:      'Total cost',
    annualTotal:    'Annual total',
    docType:        'Document',
    docPeriod:      'Period',
    docStatus:      'Status',
    docSize:        'Size',
    checkId:        'ID',
    checkName:      'Check',
    expected:       'Expected',
    actual:         'Actual',
    details:        'Details',
    overallPass:    'PASS — ALL CHECKS PASSED',
    overallFail:    'FAIL — ERRORS FOUND',
    checksOf:       'of',
    passed:         'passed',
    downloadJson:   'Download report (JSON)',
    downloadCsv:    'Download checks (CSV)',
    durationMs:     'Duration',
    ms:             'ms',
  },
  bg: {
    title: 'Интеграционен тест',
    subtitle: 'Пълна проверка: проводки, ОПР, баланс, ДДС, осигуровки, документи',
    selectScenario: 'Изберете сценарий',
    scenarios: {
      small_it_company:       'Малка IT компания (ООД, ДДС, 2 служители)',
      freelancer:             'Самоосигуряващ се (без ДДС, без служители)',
      company_with_employees: 'Компания с 5 служители (1 напуснал)',
    },
    runTest: 'Стартирай тест',
    running: 'Изпълнява се...',
    secInput:       'Входни данни',
    secJournal:     'Проводки',
    secOPR:         'ОПР',
    secBalance:     'Баланс',
    secVAT:         'ДДС',
    secPayroll:     'Осигуровки',
    secDocuments:   'Документи',
    secChecks:      'Проверки',
    company:        'Компания',
    eik:            'ЕИК',
    legalForm:      'Правна форма',
    transactions:   'Транзакции',
    period:         'Период',
    total:          'Общо',
    avgPerDay:      'Средно/ден',
    type:           'Тип',
    count:          'Брой',
    totalAmount:    'Сума €',
    month:          'Месец',
    income:         'Приход',
    expense:        'Разход',
    operations:     'Операции',
    employees:      'Служители',
    totalEmp:       'Общо',
    totalGross:     'Общо бруто €',
    avgSalary:      'Средна заплата €',
    totalEntries:   'Общо записи',
    account:        'Сметка',
    debit:          'Дебит',
    credit:         'Кредит',
    balance:        'Салдо',
    problems:       'Проблеми',
    noProblems:     'Няма проблеми',
    totalRevenue:   'Общо приходи',
    totalExpenses:  'Общо разходи',
    financialResult:'Финансов резултат',
    nonDeductible:  'Непризнати разходи',
    taxableProfit:  'Данъчна печалба',
    corporateTax:   'Корпоративен данък (10%)',
    netProfit:      'Чиста печалба',
    totalAssets:    'Общо активи',
    totalPassive:   'Общо пасиви',
    balanced:       'БАЛАНСЪТ Е ВЕРЕН',
    notBalanced:    'БАЛАНСЪТ НЕ Е ВЕРЕН',
    difference:     'Разлика',
    bankBalance:    'Банка (сч.503)',
    fixedAssets:    'Дълготрайни активи',
    debtors:        'Вземания (сч.411)',
    capital:        'Капитал (сч.102)',
    retainedEarnings:'Неразпред. печалба (сч.122)',
    currentProfit:  'Текуща печалба',
    creditors:      'Задълж. доставчици (сч.401)',
    vatPayable:     'ДДС за внасяне (сч.451)',
    salaryPayable:  'Задълж. персонал (сч.421)',
    taxPayable:     'Данъчни задълж. (сч.453)',
    vatCollected:   'Начислен ДДС',
    vatDeductible:  'Данъчен кредит',
    vatDue:         'За внасяне',
    gross:          'Бруто',
    erContrib:      'Работодател',
    eeContrib:      'Работник',
    incomeTax:      'ДДФЛ',
    net:            'Нетто',
    totalCost:      'Общ разход',
    annualTotal:    'Годишен итог',
    docType:        'Документ',
    docPeriod:      'Период',
    docStatus:      'Статус',
    docSize:        'Размер',
    checkId:        'ID',
    checkName:      'Проверка',
    expected:       'Очаквано',
    actual:         'Фактично',
    details:        'Детайли',
    overallPass:    'PASS — ВСИЧКИ ПРОВЕРКИ ПРЕМИНАХА',
    overallFail:    'FAIL — ИМА ГРЕШКИ',
    checksOf:       'от',
    passed:         'преминали',
    downloadJson:   'Изтегли отчёт (JSON)',
    downloadCsv:    'Изтегли проверки (CSV)',
    durationMs:     'Продължителност',
    ms:             'мс',
  },
  uk: {
    title: 'Інтеграційний тест',
    subtitle: 'Повна перевірка: проведення, ОПР, баланс, ПДВ, нарахування, документи',
    selectScenario: 'Оберіть сценарій',
    scenarios: {
      small_it_company:       'Мала IT компанія (ООД, ПДВ, 2 співробітники)',
      freelancer:             'Самозайнятий (без ПДВ, без співробітників)',
      company_with_employees: 'Компанія з 5 співробітниками (1 звільнений)',
    },
    runTest: 'Запустити тест',
    running: 'Виконується...',
    secInput:       'Вхідні дані',
    secJournal:     'Проведення',
    secOPR:         'ОПР',
    secBalance:     'Баланс',
    secVAT:         'ПДВ',
    secPayroll:     'Нарахування',
    secDocuments:   'Документи',
    secChecks:      'Перевірки',
    company:        'Компанія',
    eik:            'ЄІК',
    legalForm:      'Правова форма',
    transactions:   'Транзакції',
    period:         'Період',
    total:          'Всього',
    avgPerDay:      'Сер. на день',
    type:           'Тип',
    count:          'Кількість',
    totalAmount:    'Сума €',
    month:          'Місяць',
    income:         'Дохід',
    expense:        'Витрата',
    operations:     'Операцій',
    employees:      'Співробітники',
    totalEmp:       'Всього',
    totalGross:     'Загальний брутто €',
    avgSalary:      'Середня зарплата €',
    totalEntries:   'Всього записів',
    account:        'Рахунок',
    debit:          'Дебет',
    credit:         'Кредит',
    balance:        'Залишок',
    problems:       'Проблеми',
    noProblems:     'Немає проблем',
    totalRevenue:   'Разом доходи',
    totalExpenses:  'Разом витрати',
    financialResult:'Фінансовий результат',
    nonDeductible:  'Невизнані витрати',
    taxableProfit:  'Оподатковуваний прибуток',
    corporateTax:   'Корпоративний податок (10%)',
    netProfit:      'Чистий прибуток',
    totalAssets:    'Разом активи',
    totalPassive:   'Разом пасиви',
    balanced:       'БАЛАНС ЗБІГАЄТЬСЯ',
    notBalanced:    'БАЛАНС НЕ ЗБІГАЄТЬСЯ',
    difference:     'Різниця',
    bankBalance:    'Банк (рах.503)',
    fixedAssets:    'Основні засоби',
    debtors:        'Дебітори (рах.411)',
    capital:        'Капітал (рах.102)',
    retainedEarnings:'Нерозподілений прибуток (рах.122)',
    currentProfit:  'Поточний прибуток',
    creditors:      'Кредитори (рах.401)',
    vatPayable:     'ПДВ до сплати (рах.451)',
    salaryPayable:  'Заборг. персоналу (рах.421)',
    taxPayable:     'Податкові заборг. (рах.453)',
    vatCollected:   'ПДВ нарахований',
    vatDeductible:  'Податковий кредит',
    vatDue:         'До сплати',
    gross:          'Брутто',
    erContrib:      'Роботодавець',
    eeContrib:      'Працівник',
    incomeTax:      'ПДФО',
    net:            'Нетто',
    totalCost:      'Загальні витрати',
    annualTotal:    'Річний підсумок',
    docType:        'Документ',
    docPeriod:      'Період',
    docStatus:      'Статус',
    docSize:        'Розмір',
    checkId:        'ID',
    checkName:      'Перевірка',
    expected:       'Очікуване',
    actual:         'Фактичне',
    details:        'Деталі',
    overallPass:    'PASS — ВСІ ПЕРЕВІРКИ ПРОЙДЕНО',
    overallFail:    'FAIL — Є ПОМИЛКИ',
    checksOf:       'з',
    passed:         'пройдено',
    downloadJson:   'Завантажити звіт (JSON)',
    downloadCsv:    'Завантажити перевірки (CSV)',
    durationMs:     'Тривалість',
    ms:             'мс',
  },
}

// ─── Small reusable UI pieces ─────────────────────────────────────────────────

function SectionTitle({ title }: { title: string }) {
  return (
    <h2 className="text-base font-semibold mt-6 mb-2 pb-1 border-b"
      style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
      {title}
    </h2>
  )
}

function Row({ label, value, mono = false }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="flex justify-between py-1 text-sm border-b" style={{ borderColor: 'var(--border)' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className={mono ? 'font-mono' : ''} style={{ color: 'var(--text-primary)' }}>
        {typeof value === 'number' ? value.toFixed(2) : value}
      </span>
    </div>
  )
}

function Th({ children }: { children: string }) {
  return (
    <th className="text-left px-2 py-1 text-xs font-semibold"
      style={{ color: 'var(--text-muted)', backgroundColor: 'var(--surface)' }}>
      {children}
    </th>
  )
}

function Td({ children, mono = false, right = false }: { children: React.ReactNode; mono?: boolean; right?: boolean }) {
  return (
    <td className={`px-2 py-1 text-xs ${right ? 'text-right' : ''} ${mono ? 'font-mono' : ''}`}
      style={{ color: 'var(--text-primary)' }}>
      {children}
    </td>
  )
}

// ─── Download helpers ──────────────────────────────────────────────────────────

function downloadJson(result: IntegrationTestResult) {
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `integration_test_${result.company.eik}_${result.generatedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function downloadChecksCsv(result: IntegrationTestResult, labels: typeof T['ru']) {
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`
  const header = [labels.checkId, labels.checkName, labels.docStatus, labels.expected, labels.actual, labels.details]
    .map(q).join(';')
  const rows = result.checks.map(c => [
    c.id,
    c.name,
    c.passed ? 'PASS' : 'FAIL',
    c.expected,
    c.actual,
    c.details ?? '',
  ].map(v => q(String(v))).join(';'))
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `checks_${result.company.eik}_${result.generatedAt.slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function IntegrationTestRunner() {
  const language = useUserStore(s => s.language)
  const L = T[language] ?? T.ru

  const [scenario, setScenario] = useState<TestScenario>('small_it_company')
  const [running, setRunning]   = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult]     = useState<IntegrationTestResult | null>(null)

  const handleRun = async () => {
    setRunning(true)
    setResult(null)
    setProgress(0)

    // Simulate progress ticks while running (test is sync but shows feedback)
    const timer = setInterval(() => setProgress(p => Math.min(p + 12, 90)), 150)

    try {
      // yield to event loop so UI updates
      await new Promise(r => setTimeout(r, 10))
      const res = await runIntegrationTest(scenario)
      clearInterval(timer)
      setProgress(100)
      setResult(res)
    } catch (e) {
      clearInterval(timer)
      console.error('[integrationTest] failed:', e)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl space-y-4">

      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {L.title}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {L.subtitle}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            {L.selectScenario}
          </label>
          <select
            value={scenario}
            onChange={e => setScenario(e.target.value as TestScenario)}
            disabled={running}
            className="rounded-lg border px-3 py-2 text-sm focus:outline-none"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
          >
            {(['small_it_company', 'freelancer', 'company_with_employees'] as TestScenario[]).map(s => (
              <option key={s} value={s}>{L.scenarios[s]}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          className="rounded-lg px-5 py-2 text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)', color: 'white' }}
        >
          {running ? L.running : L.runTest}
        </button>
      </div>

      {/* Progress bar */}
      {(running || (result && progress === 100)) && (
        <div className="w-full rounded-full h-1.5 overflow-hidden"
          style={{ backgroundColor: 'var(--border)' }}>
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{ width: `${progress}%`, backgroundColor: 'var(--accent)' }}
          />
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-2">

          {/* ── Overall ─────────────────────────────────── */}
          <div
            className="rounded-xl p-5 text-center"
            style={{
              backgroundColor: result.overallStatus === 'PASS' ? '#dcfce7' : '#fef2f2',
              border: `2px solid ${result.overallStatus === 'PASS' ? '#16a34a' : '#dc2626'}`,
            }}
          >
            <p className="text-2xl font-bold"
              style={{ color: result.overallStatus === 'PASS' ? '#15803d' : '#dc2626' }}>
              {result.overallStatus === 'PASS' ? L.overallPass : L.overallFail}
            </p>
            <p className="text-sm mt-1" style={{ color: result.overallStatus === 'PASS' ? '#166534' : '#b91c1c' }}>
              {result.passedChecks} {L.checksOf} {result.totalChecks} {L.passed}
              {' · '}{L.durationMs}: {result.durationMs} {L.ms}
            </p>
          </div>

          {/* ── Input data ──────────────────────────────── */}
          <SectionTitle title={L.secInput} />

          <Row label={L.company}   value={result.company.name} />
          <Row label={L.eik}       value={result.company.eik} />
          <Row label={L.legalForm} value={result.company.legalForm} />
          <Row label={`${L.transactions} — ${L.total}`} value={result.transactionsSummary.total} />
          <Row label={L.period}
            value={`${result.transactionsSummary.period.from} — ${result.transactionsSummary.period.to}`} />
          <Row label={L.avgPerDay} value={result.transactionsSummary.avgPerDay} />

          {/* By type */}
          <div className="overflow-x-auto rounded-lg border mt-2" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr><Th>{L.type}</Th><Th>{L.count}</Th><Th>{L.totalAmount}</Th></tr>
              </thead>
              <tbody>
                {Object.entries(result.transactionsSummary.byType)
                  .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
                  .map(([type, v]) => (
                    <tr key={type} className="border-t" style={{ borderColor: 'var(--border)' }}>
                      <Td mono>{type}</Td>
                      <Td right>{v.count}</Td>
                      <Td right mono>{v.totalAmount.toFixed(2)}</Td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* By month */}
          <div className="overflow-x-auto rounded-lg border mt-2" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <Th>{L.month}</Th>
                  <Th>{L.income}</Th>
                  <Th>{L.expense}</Th>
                  <Th>{L.operations}</Th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(result.transactionsSummary.byMonth)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([m, v]) => (
                    <tr key={m} className="border-t" style={{ borderColor: 'var(--border)' }}>
                      <Td>{m}</Td>
                      <Td right mono>{v.income.toFixed(2)}</Td>
                      <Td right mono>{v.expense.toFixed(2)}</Td>
                      <Td right>{v.count}</Td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Employees */}
          {result.employeesSummary.total > 0 && (
            <>
              <Row label={`${L.employees} — ${L.totalEmp}`} value={result.employeesSummary.total} />
              <Row label={L.totalGross} value={result.employeesSummary.totalGrossSalary} />
              <Row label={L.avgSalary}  value={parseFloat(result.employeesSummary.avgSalary.toFixed(2))} />
            </>
          )}

          {/* ── Journal ─────────────────────────────────── */}
          <SectionTitle title={L.secJournal} />

          <Row label={L.totalEntries} value={result.journalSummary.totalEntries} />

          <div className="overflow-x-auto rounded-lg border mt-2" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <Th>{L.account}</Th>
                  <Th>{L.debit}</Th>
                  <Th>{L.credit}</Th>
                  <Th>{L.balance}</Th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(result.journalSummary.byAccount)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([acc, v]) => (
                    <tr key={acc} className="border-t" style={{ borderColor: 'var(--border)' }}>
                      <Td mono>{acc}</Td>
                      <Td right mono>{v.debitTotal.toFixed(2)}</Td>
                      <Td right mono>{v.creditTotal.toFixed(2)}</Td>
                      <Td right mono>
                        <span style={{ color: v.balance >= 0 ? 'var(--text-primary)' : '#dc2626' }}>
                          {v.balance.toFixed(2)}
                        </span>
                      </Td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Problems */}
          {(result.journalSummary.missingEntries.length > 0 || result.journalSummary.orphanEntries.length > 0) && (
            <div className="rounded-lg p-3 text-xs mt-2"
              style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>
              <p className="font-semibold mb-1">{L.problems}:</p>
              {result.journalSummary.missingEntries.map((m, i) => <p key={i}>• {m}</p>)}
              {result.journalSummary.orphanEntries.map((m, i) => <p key={i}>• {m}</p>)}
            </div>
          )}

          {/* ── OPR ─────────────────────────────────────── */}
          <SectionTitle title={L.secOPR} />

          {[
            [L.totalRevenue,    result.oprResult.totalRevenue],
            [L.totalExpenses,   result.oprResult.totalExpenses],
            [L.financialResult, result.oprResult.financialResult],
            [L.nonDeductible,   result.oprResult.nonDeductible],
            [L.taxableProfit,   result.oprResult.taxableProfit],
            [L.corporateTax,    result.oprResult.corporateTax],
            [L.netProfit,       result.oprResult.netProfit],
          ].map(([label, val]) => (
            <Row key={String(label)} label={String(label)} value={val as number} mono />
          ))}

          {/* ── Balance ─────────────────────────────────── */}
          <SectionTitle title={L.secBalance} />

          <div
            className="rounded-xl p-4 text-center text-sm font-bold mb-2"
            style={{
              backgroundColor: result.balanceResult.isBalanced ? '#dcfce7' : '#fef2f2',
              color: result.balanceResult.isBalanced ? '#15803d' : '#dc2626',
              border: `2px solid ${result.balanceResult.isBalanced ? '#16a34a' : '#dc2626'}`,
            }}
          >
            {result.balanceResult.isBalanced ? L.balanced : L.notBalanced}
            {!result.balanceResult.isBalanced && (
              <span className="ml-2 font-normal">
                {L.difference}: {result.balanceResult.difference.toFixed(4)} €
              </span>
            )}
          </div>

          {[
            ['— АКТИВИ —',           ''],
            [L.bankBalance,          result.balanceResult.details.bankBalance],
            [L.fixedAssets,          result.balanceResult.details.fixedAssets],
            [L.debtors,              result.balanceResult.details.debtors],
            [L.totalAssets,          result.balanceResult.totalAssets],
            ['— ПАСИВИ —',           ''],
            [L.capital,              result.balanceResult.details.capital],
            [L.retainedEarnings,     result.balanceResult.details.retainedEarnings],
            [L.currentProfit,        result.balanceResult.details.currentProfit],
            [L.creditors,            result.balanceResult.details.creditors],
            [L.vatPayable,           result.balanceResult.details.vatPayable],
            [L.salaryPayable,        result.balanceResult.details.salaryPayable],
            [L.taxPayable,           result.balanceResult.details.taxPayable],
            [L.totalPassive,         result.balanceResult.totalPassive],
          ].map(([label, val]) => (
            <Row key={String(label)} label={String(label)}
              value={val === '' ? '' : (val as number).toFixed(2)}
              mono={val !== ''} />
          ))}

          {/* ── VAT ─────────────────────────────────────── */}
          {Object.keys(result.vatSummary.byMonth).length > 0 && (
            <>
              <SectionTitle title={L.secVAT} />

              <Row label={L.vatCollected}  value={result.vatSummary.totalCollected} mono />
              <Row label={L.vatDeductible} value={result.vatSummary.totalDeductible} mono />
              <Row label={L.vatDue}        value={result.vatSummary.vatPayable} mono />

              <div className="overflow-x-auto rounded-lg border mt-2" style={{ borderColor: 'var(--border)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <Th>{L.month}</Th>
                      <Th>{L.vatCollected}</Th>
                      <Th>{L.vatDeductible}</Th>
                      <Th>{L.vatDue}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.vatSummary.byMonth)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([m, v]) => (
                        <tr key={m} className="border-t" style={{ borderColor: 'var(--border)' }}>
                          <Td>{m}</Td>
                          <Td right mono>{v.collected.toFixed(2)}</Td>
                          <Td right mono>{v.deductible.toFixed(2)}</Td>
                          <Td right mono>
                            <span style={{ color: v.payable > 0 ? '#dc2626' : 'var(--text-primary)' }}>
                              {v.payable.toFixed(2)}
                            </span>
                          </Td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Payroll ──────────────────────────────────── */}
          {result.payrollSummary && (
            <>
              <SectionTitle title={L.secPayroll} />

              <div className="overflow-x-auto rounded-lg border mt-2" style={{ borderColor: 'var(--border)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <Th>{L.month}</Th>
                      <Th>{L.gross}</Th>
                      <Th>{L.erContrib}</Th>
                      <Th>{L.eeContrib}</Th>
                      <Th>{L.incomeTax}</Th>
                      <Th>{L.net}</Th>
                      <Th>{L.totalCost}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.payrollSummary.byMonth)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([m, v]) => (
                        <tr key={m} className="border-t" style={{ borderColor: 'var(--border)' }}>
                          <Td>{m}</Td>
                          <Td right mono>{v.totalGross.toFixed(2)}</Td>
                          <Td right mono>{v.totalEmployerContrib.toFixed(2)}</Td>
                          <Td right mono>{v.totalEmployeeContrib.toFixed(2)}</Td>
                          <Td right mono>{v.totalIncomeTax.toFixed(2)}</Td>
                          <Td right mono>{v.totalNet.toFixed(2)}</Td>
                          <Td right mono>{v.totalCost.toFixed(2)}</Td>
                        </tr>
                      ))}
                    {/* Annual total */}
                    <tr className="border-t font-semibold"
                      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
                      <Td><strong>{L.annualTotal}</strong></Td>
                      <Td right mono>{result.payrollSummary.annualTotal.gross.toFixed(2)}</Td>
                      <Td right mono>{result.payrollSummary.annualTotal.employerContrib.toFixed(2)}</Td>
                      <Td right mono>{result.payrollSummary.annualTotal.employeeContrib.toFixed(2)}</Td>
                      <Td right mono>{result.payrollSummary.annualTotal.incomeTax.toFixed(2)}</Td>
                      <Td right mono>{result.payrollSummary.annualTotal.netPaid.toFixed(2)}</Td>
                      <Td right mono>{result.payrollSummary.annualTotal.totalCost.toFixed(2)}</Td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Documents ────────────────────────────────── */}
          <SectionTitle title={L.secDocuments} />

          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <Th>{L.docType}</Th>
                  <Th>{L.docPeriod}</Th>
                  <Th>{L.docStatus}</Th>
                  <Th>{L.docSize}</Th>
                </tr>
              </thead>
              <tbody>
                {result.documentsGenerated.map((doc, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <Td mono>{doc.type}</Td>
                    <Td>{doc.period}</Td>
                    <Td>
                      <span style={{ color: doc.success ? '#16a34a' : '#dc2626' }}>
                        {doc.success ? '✅ OK' : `❌ ${doc.error ?? 'Error'}`}
                      </span>
                    </Td>
                    <Td right mono>{doc.sizeBytes ? `${doc.sizeBytes} b` : '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Checks ───────────────────────────────────── */}
          <SectionTitle title={L.secChecks} />

          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <Th>{L.checkId}</Th>
                  <Th>{L.checkName}</Th>
                  <Th>{L.docStatus}</Th>
                  <Th>{L.expected}</Th>
                  <Th>{L.actual}</Th>
                  <Th>{L.details}</Th>
                </tr>
              </thead>
              <tbody>
                {result.checks.map(c => (
                  <tr key={c.id}
                    className="border-t"
                    style={{
                      borderColor: 'var(--border)',
                      backgroundColor: c.passed ? 'transparent' : '#fef2f2',
                    }}>
                    <Td mono>{c.id}</Td>
                    <Td>{c.name}</Td>
                    <Td>
                      <span style={{ color: c.passed ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                        {c.passed ? '✅' : '❌'}
                      </span>
                    </Td>
                    <Td mono>{c.expected}</Td>
                    <Td mono>{c.actual}</Td>
                    <Td>{c.details ?? '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Export buttons ───────────────────────────── */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => downloadJson(result)}
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            >
              {L.downloadJson}
            </button>
            <button
              onClick={() => downloadChecksCsv(result, L)}
              className="rounded-lg px-4 py-2 text-sm"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              {L.downloadCsv}
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
