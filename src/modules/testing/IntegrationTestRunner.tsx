import { useState } from 'react'
import { useUserStore } from '../../store/userStore'
import {
  runFullAudit,
  type FullAuditResult,
  type TestScenario,
  type AccountingDiagnosticsResult,
  type IntegrationTestResult,
} from './integrationTest'

// ─── i18n ─────────────────────────────────────────────────────────────────────

const MONTHS = [
  '2026-01','2026-02','2026-03','2026-04','2026-05','2026-06',
  '2026-07','2026-08','2026-09','2026-10','2026-11','2026-12',
]

const MONTH_NAMES: Record<string, Record<string, string>> = {
  ru: { '01':'Январь','02':'Февраль','03':'Март','04':'Апрель','05':'Май','06':'Июнь',
        '07':'Июль','08':'Август','09':'Сентябрь','10':'Октябрь','11':'Ноябрь','12':'Декабрь' },
  en: { '01':'January','02':'February','03':'March','04':'April','05':'May','06':'June',
        '07':'July','08':'August','09':'September','10':'October','11':'November','12':'December' },
  bg: { '01':'Януари','02':'Февруари','03':'Март','04':'Април','05':'Май','06':'Юни',
        '07':'Юли','08':'Август','09':'Септември','10':'Октомври','11':'Ноември','12':'Декември' },
  uk: { '01':'Січень','02':'Лютий','03':'Березень','04':'Квітень','05':'Травень','06':'Червень',
        '07':'Липень','08':'Серпень','09':'Вересень','10':'Жовтень','11':'Листопад','12':'Грудень' },
}

type PeriodType = 'month' | 'quarter' | 'year'

function periodToDates(type: PeriodType, value: string): { from: string; to: string; label: string; fileTag: string } {
  if (type === 'month') {
    const m = value // e.g. '2026-03'
    const y = parseInt(m.slice(0, 4))
    const mi = parseInt(m.slice(5, 7))
    const lastDay = new Date(y, mi, 0).getDate()
    return { from: `${m}-01`, to: `${m}-${String(lastDay).padStart(2, '0')}`, label: m, fileTag: m.replace('-', '_') }
  }
  if (type === 'quarter') {
    const [, qi] = value.split('-Q') // e.g. '2026-Q2'
    const q = parseInt(qi)
    const startMonth = String((q - 1) * 3 + 1).padStart(2, '0')
    const endMonth = String(q * 3).padStart(2, '0')
    const y = parseInt(value.slice(0, 4))
    const lastDay = new Date(y, q * 3, 0).getDate()
    return { from: `${y}-${startMonth}-01`, to: `${y}-${endMonth}-${lastDay}`, label: value, fileTag: `${y}_Q${q}` }
  }
  // year
  return { from: `${value}-01-01`, to: `${value}-12-31`, label: value, fileTag: value }
}

const T: Record<string, Record<string, string>> = {
  ru: {
    scenario: 'Сценарий', period: 'Период', month: 'Месяц', quarter: 'Квартал', year: 'Год',
    run: 'Запустить полную проверку', running: 'Выполняется...',
    allPassed: 'ВСЕ ПРОВЕРКИ ПРОШЛИ', hasErrors: 'ЕСТЬ ОШИБКИ',
    of: 'из', passed: 'пройдено', skipped: 'пропущено', ms: 'мс',
    checkFor: 'Проверка за',
    sysBalance: 'Системный баланс', manBalance: 'Ручной баланс (контроль)',
    converges: 'СХОДИТСЯ',
    secTx: 'Транзакции', secTrialBal: 'Оборотная ведомост', secOPR: 'ОПР', secBalance: 'Баланс: ручной vs системный',
    secChecks: 'Проверки', secErrors: 'Ошибки', secBalanceDiff: 'Расхождения баланса',
    company: 'Компания', eik: 'ЕИК', totalTx: 'Всего транзакций', periodLabel: 'Период',
    type: 'Тип', count: 'Кол-во', amount: 'Сумма',
    mismatchCount: 'транзакции с несоответствием суммы проводки',
    trialIdentity: 'Контролно тождество', debit: 'Дебит', credit: 'Кредит',
    account: 'Сметка', name: 'Наименование', accType: 'Тип', turnDt: 'Оборот Дт', turnCt: 'Оборот Кт',
    balance: 'Салдо', side: 'Страна', total: 'ИТОГО',
    totalRevenue: 'Итого доходы', totalExpenses: 'Итого расходы', financialResult: 'Финансовый результат',
    nonDeductible: 'Непризнаваемые расходы', taxableProfit: 'Налоговая прибыль',
    corpTax: 'Корпоративный данък', netProfit: 'Чистая прибыль',
    assets: 'АКТИВИ', liabilities: 'ПАСИВИ', totalLabel: 'ОБЩО',
    manualNetProfit: 'Чистая прибыль',
    indicator: 'Показател', manual: 'Ръчно', system: 'Системно', diff: 'Разлика',
    id: 'ID', check: 'Проверка', status: 'Статус', expected: 'Ожидаемо', actual: 'Фактично', details: 'Детали',
    reason: 'Причина',
    diffCount: 'расхождений между ручным и системным балансом',
    dlFull: 'Скачать полный отчёт (JSON)', dlTrialBal: 'Скачать оборотную ведомость (CSV)',
    dlComparison: 'Скачать сравнение баланса (CSV)', dlChecks: 'Скачать все проверки (CSV)',
    sc_small: 'Малая IT компания (ООД, ДДС, 2 сотрудника)',
    sc_free: 'Самоосигуряващ се (без ДДС, без сотрудников)',
    sc_empl: 'Компания с 5 сотрудниками (1 уволен)',
    violated: 'НАРУШЕНО',
  },
  en: {
    scenario: 'Scenario', period: 'Period', month: 'Month', quarter: 'Quarter', year: 'Year',
    run: 'Run full audit', running: 'Running...',
    allPassed: 'ALL CHECKS PASSED', hasErrors: 'ERRORS FOUND',
    of: 'of', passed: 'passed', skipped: 'skipped', ms: 'ms',
    checkFor: 'Audit for',
    sysBalance: 'System balance', manBalance: 'Manual balance (control)',
    converges: 'BALANCED',
    secTx: 'Transactions', secTrialBal: 'Trial balance', secOPR: 'P&L', secBalance: 'Balance: manual vs system',
    secChecks: 'Checks', secErrors: 'Errors', secBalanceDiff: 'Balance discrepancies',
    company: 'Company', eik: 'EIK', totalTx: 'Total transactions', periodLabel: 'Period',
    type: 'Type', count: 'Count', amount: 'Amount',
    mismatchCount: 'transactions with journal amount mismatch',
    trialIdentity: 'Control identity', debit: 'Debit', credit: 'Credit',
    account: 'Account', name: 'Name', accType: 'Type', turnDt: 'Debit turnover', turnCt: 'Credit turnover',
    balance: 'Balance', side: 'Side', total: 'TOTAL',
    totalRevenue: 'Total revenue', totalExpenses: 'Total expenses', financialResult: 'Financial result',
    nonDeductible: 'Non-deductible', taxableProfit: 'Taxable profit',
    corpTax: 'Corporate tax', netProfit: 'Net profit',
    assets: 'ASSETS', liabilities: 'LIABILITIES', totalLabel: 'TOTAL',
    manualNetProfit: 'Net profit',
    indicator: 'Indicator', manual: 'Manual', system: 'System', diff: 'Difference',
    id: 'ID', check: 'Check', status: 'Status', expected: 'Expected', actual: 'Actual', details: 'Details',
    reason: 'Reason',
    diffCount: 'discrepancies between manual and system balance',
    dlFull: 'Download full report (JSON)', dlTrialBal: 'Download trial balance (CSV)',
    dlComparison: 'Download balance comparison (CSV)', dlChecks: 'Download all checks (CSV)',
    sc_small: 'Small IT company (OOD, VAT, 2 employees)',
    sc_free: 'Freelancer (no VAT, no employees)',
    sc_empl: 'Company with 5 employees (1 terminated)',
    violated: 'VIOLATED',
  },
  bg: {
    scenario: 'Сценарий', period: 'Период', month: 'Месец', quarter: 'Тримесечие', year: 'Година',
    run: 'Стартирай пълна проверка', running: 'Изпълнява се...',
    allPassed: 'ВСИЧКИ ПРОВЕРКИ ПРЕМИНАХА', hasErrors: 'ИМА ГРЕШКИ',
    of: 'от', passed: 'преминали', skipped: 'пропуснати', ms: 'мс',
    checkFor: 'Проверка за',
    sysBalance: 'Системен баланс', manBalance: 'Ръчен баланс (контрол)',
    converges: 'СХОДИТСЯ',
    secTx: 'Транзакции', secTrialBal: 'Оборотна ведомост', secOPR: 'ОПР', secBalance: 'Баланс: ръчен vs системен',
    secChecks: 'Проверки', secErrors: 'Грешки', secBalanceDiff: 'Разминавания в баланса',
    company: 'Компания', eik: 'ЕИК', totalTx: 'Общо транзакции', periodLabel: 'Период',
    type: 'Тип', count: 'Брой', amount: 'Сума',
    mismatchCount: 'транзакции с несъответствие на сумата',
    trialIdentity: 'Контролно тождество', debit: 'Дебит', credit: 'Кредит',
    account: 'Сметка', name: 'Наименование', accType: 'Тип', turnDt: 'Оборот Дт', turnCt: 'Оборот Кт',
    balance: 'Салдо', side: 'Страна', total: 'ИТОГО',
    totalRevenue: 'Общо приходи', totalExpenses: 'Общо разходи', financialResult: 'Финансов резултат',
    nonDeductible: 'Непризнати разходи', taxableProfit: 'Данъчна печалба',
    corpTax: 'Корпоративен данък', netProfit: 'Чиста печалба',
    assets: 'АКТИВИ', liabilities: 'ПАСИВИ', totalLabel: 'ОБЩО',
    manualNetProfit: 'Чиста печалба',
    indicator: 'Показател', manual: 'Ръчно', system: 'Системно', diff: 'Разлика',
    id: 'ID', check: 'Проверка', status: 'Статус', expected: 'Очаквано', actual: 'Фактично', details: 'Детайли',
    reason: 'Причина',
    diffCount: 'разминавания между ръчен и системен баланс',
    dlFull: 'Изтегли пълен отчет (JSON)', dlTrialBal: 'Изтегли оборотна ведомост (CSV)',
    dlComparison: 'Изтегли сравнение баланс (CSV)', dlChecks: 'Изтегли всички проверки (CSV)',
    sc_small: 'Малка IT компания (ООД, ДДС, 2 служители)',
    sc_free: 'Самоосигуряващ се (без ДДС)',
    sc_empl: 'Компания с 5 служители (1 напуснал)',
    violated: 'НАРУШЕНО',
  },
  uk: {
    scenario: 'Сценарій', period: 'Період', month: 'Місяць', quarter: 'Квартал', year: 'Рік',
    run: 'Запустити повну перевірку', running: 'Виконується...',
    allPassed: 'ВСІ ПЕРЕВІРКИ ПРОЙДЕНО', hasErrors: 'Є ПОМИЛКИ',
    of: 'з', passed: 'пройдено', skipped: 'пропущено', ms: 'мс',
    checkFor: 'Перевірка за',
    sysBalance: 'Системний баланс', manBalance: 'Ручний баланс (контроль)',
    converges: 'ЗБІГАЄТЬСЯ',
    secTx: 'Транзакції', secTrialBal: 'Оборотна відомість', secOPR: 'ОПР', secBalance: 'Баланс: ручний vs системний',
    secChecks: 'Перевірки', secErrors: 'Помилки', secBalanceDiff: 'Розбіжності балансу',
    company: 'Компанія', eik: 'ЄІК', totalTx: 'Всього транзакцій', periodLabel: 'Період',
    type: 'Тип', count: 'Кількість', amount: 'Сума',
    mismatchCount: 'транзакції з невідповідністю суми',
    trialIdentity: 'Контрольна тотожність', debit: 'Дебет', credit: 'Кредит',
    account: 'Рахунок', name: 'Назва', accType: 'Тип', turnDt: 'Оборот Дт', turnCt: 'Оборот Кт',
    balance: 'Залишок', side: 'Сторона', total: 'ВСЬОГО',
    totalRevenue: 'Разом доходи', totalExpenses: 'Разом витрати', financialResult: 'Фінансовий результат',
    nonDeductible: 'Невизнані витрати', taxableProfit: 'Оподаткований прибуток',
    corpTax: 'Корпоративний податок', netProfit: 'Чистий прибуток',
    assets: 'АКТИВИ', liabilities: 'ПАСИВИ', totalLabel: 'ВСЬОГО',
    manualNetProfit: 'Чистий прибуток',
    indicator: 'Показник', manual: 'Ручний', system: 'Системний', diff: 'Різниця',
    id: 'ID', check: 'Перевірка', status: 'Статус', expected: 'Очікуване', actual: 'Фактичне', details: 'Деталі',
    reason: 'Причина',
    diffCount: 'розбіжностей між ручним і системним балансом',
    dlFull: 'Завантажити повний звіт (JSON)', dlTrialBal: 'Завантажити оборотну відомість (CSV)',
    dlComparison: 'Завантажити порівняння балансу (CSV)', dlChecks: 'Завантажити всі перевірки (CSV)',
    sc_small: 'Мала IT компанія (ООД, ПДВ, 2 співробітники)',
    sc_free: 'Самозайнятий (без ПДВ)',
    sc_empl: 'Компанія з 5 співробітниками (1 звільнений)',
    violated: 'ПОРУШЕНО',
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

// ─── Main component ────────────────────────────────────────────────────────────

export default function FullAuditReport() {
  const language = useUserStore(s => s.language) || 'ru'
  const L = T[language] ?? T.ru
  const monthNames = MONTH_NAMES[language] ?? MONTH_NAMES.ru

  const [scenario, setScenario] = useState<TestScenario>('small_it_company')
  const [periodType, setPeriodType] = useState<PeriodType>('year')
  const [monthVal, setMonthVal]     = useState('2026-03')
  const [quarterVal, setQuarterVal] = useState('2026-Q1')
  const [yearVal]                   = useState('2026')
  const [running, setRunning]       = useState(false)
  const [progress, setProgress]     = useState(0)
  const [result, setResult]         = useState<FullAuditResult | null>(null)

  const scenarioLabels: Record<TestScenario, string> = {
    small_it_company: L.sc_small, freelancer: L.sc_free, company_with_employees: L.sc_empl,
  }

  function getMonthLabel(m: string) {
    return `${monthNames[m.slice(5, 7)] ?? m.slice(5, 7)} ${m.slice(0, 4)}`
  }

  const handleRun = async () => {
    setRunning(true)
    setResult(null)
    setProgress(0)

    const selVal = periodType === 'month' ? monthVal : periodType === 'quarter' ? quarterVal : yearVal
    const { from, to } = periodToDates(periodType, selVal)

    const displayLabel = periodType === 'month' ? getMonthLabel(monthVal)
      : periodType === 'quarter' ? quarterVal.replace('-', ' ')
      : yearVal

    const timer = setInterval(() => setProgress(p => Math.min(p + 8, 90)), 150)

    try {
      await new Promise(r => setTimeout(r, 10))
      const res = await runFullAudit(scenario, from, to, displayLabel)
      clearInterval(timer)
      setProgress(100)
      setResult(res)
    } catch (e) {
      clearInterval(timer)
      console.error('[fullAudit] failed:', e)
    } finally {
      setRunning(false)
    }
  }

  const itg = result?.integration
  const diag = result?.diagnostics

  const radioStyle = (active: boolean) => ({
    backgroundColor: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? 'white' : 'var(--text-secondary)',
    borderColor: active ? 'var(--accent)' : 'var(--border)',
  })

  return (
    <div className="p-6 max-w-5xl space-y-4">

      {/* ── Controls ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Scenario */}
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{L.scenario}</label>
          <select
            value={scenario}
            onChange={e => setScenario(e.target.value as TestScenario)}
            disabled={running}
            className="rounded-lg border px-3 py-2 text-sm focus:outline-none"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
          >
            {(['small_it_company', 'freelancer', 'company_with_employees'] as TestScenario[]).map(s => (
              <option key={s} value={s}>{scenarioLabels[s]}</option>
            ))}
          </select>
        </div>

        {/* Period type radio */}
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{L.period}</label>
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            {(['month', 'quarter', 'year'] as PeriodType[]).map(pt => (
              <button
                key={pt}
                onClick={() => setPeriodType(pt)}
                disabled={running}
                className="px-3 py-2 text-xs font-medium border-r last:border-r-0 transition-colors"
                style={radioStyle(periodType === pt)}
              >
                {L[pt]}
              </button>
            ))}
          </div>
        </div>

        {/* Period value dropdown */}
        {periodType === 'month' && (
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{L.month}</label>
            <select
              value={monthVal}
              onChange={e => setMonthVal(e.target.value)}
              disabled={running}
              className="rounded-lg border px-3 py-2 text-sm focus:outline-none"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
            >
              {MONTHS.map(m => (
                <option key={m} value={m}>{getMonthLabel(m)}</option>
              ))}
            </select>
          </div>
        )}
        {periodType === 'quarter' && (
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{L.quarter}</label>
            <select
              value={quarterVal}
              onChange={e => setQuarterVal(e.target.value)}
              disabled={running}
              className="rounded-lg border px-3 py-2 text-sm focus:outline-none"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
            >
              {['2026-Q1','2026-Q2','2026-Q3','2026-Q4'].map(q => (
                <option key={q} value={q}>{q.replace('-', ' ')}</option>
              ))}
            </select>
          </div>
        )}
        {periodType === 'year' && (
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{L.year}</label>
            <select disabled={running}
              className="rounded-lg border px-3 py-2 text-sm focus:outline-none"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
            >
              <option>2026</option>
            </select>
          </div>
        )}

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={running}
          className="rounded-lg px-5 py-2 text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)', color: 'white' }}
        >
          {running ? L.running : L.run}
        </button>
      </div>

      {/* Progress */}
      {(running || (result && progress === 100)) && (
        <div className="w-full rounded-full h-1.5 overflow-hidden"
          style={{ backgroundColor: 'var(--border)' }}>
          <div className="h-full rounded-full transition-all duration-150"
            style={{ width: `${progress}%`, backgroundColor: 'var(--accent)' }} />
        </div>
      )}

      {/* ═══════════ REPORT ═══════════ */}
      {itg && diag && result && (
        <div className="space-y-2">

          {/* ── 1. СВОДКА ──────────────────────────────────── */}
          <div
            className="rounded-xl p-5 text-center"
            style={{
              backgroundColor: itg.overallStatus === 'PASS' ? '#dcfce7' : '#fef2f2',
              border: `2px solid ${itg.overallStatus === 'PASS' ? '#16a34a' : '#dc2626'}`,
            }}
          >
            <p className="text-2xl font-bold"
              style={{ color: itg.overallStatus === 'PASS' ? '#15803d' : '#dc2626' }}>
              {itg.overallStatus === 'PASS' ? L.allPassed : L.hasErrors}
            </p>
            <p className="text-sm mt-1" style={{ color: itg.overallStatus === 'PASS' ? '#166534' : '#b91c1c' }}>
              {itg.passedChecks} {L.of} {itg.totalChecks} {L.passed}
              {itg.skippedChecks > 0 && ` · ${itg.skippedChecks} ${L.skipped}`}
              {' · '}{result.durationMs} {L.ms}
            </p>
            <p className="text-xs mt-1" style={{ color: itg.overallStatus === 'PASS' ? '#166534' : '#b91c1c' }}>
              {L.checkFor} {result.periodLabel} ({L.scenario}: {scenarioLabels[scenario]})
            </p>
          </div>

          {/* Balance quick status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3 text-center text-xs" style={{ border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-muted)' }}>{L.sysBalance}</div>
              <div className="text-lg font-bold font-mono" style={{ color: diag.systemBalance.isBalanced ? '#15803d' : '#dc2626' }}>
                {diag.systemBalance.isBalanced ? L.converges : `${diag.systemBalance.difference.toFixed(4)}`}
              </div>
              <div className="font-mono mt-1">
                A: {diag.systemBalance.totalAssets.toFixed(2)} | P: {diag.systemBalance.totalPassive.toFixed(2)}
              </div>
            </div>
            <div className="rounded-lg p-3 text-center text-xs" style={{ border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-muted)' }}>{L.manBalance}</div>
              <div className="text-lg font-bold font-mono" style={{ color: Math.abs(diag.manualBalance.difference) < 0.01 ? '#15803d' : '#dc2626' }}>
                {Math.abs(diag.manualBalance.difference) < 0.01 ? L.converges : `${diag.manualBalance.difference.toFixed(4)}`}
              </div>
              <div className="font-mono mt-1">
                A: {diag.manualBalance.totalAssets.toFixed(2)} | P: {diag.manualBalance.totalPassive.toFixed(2)}
              </div>
            </div>
          </div>

          {/* ── 2. ТРАНЗАКЦИИ ──────────────────────────────── */}
          <SectionTitle title={L.secTx} />
          <Row label={L.company} value={itg.company.name} />
          <Row label={L.eik} value={itg.company.eik} />
          <Row label={L.totalTx} value={itg.transactionsSummary.total} />
          <Row label={L.periodLabel} value={`${result.periodFrom} — ${result.periodTo}`} />

          <div className="overflow-x-auto rounded-lg border mt-2" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-xs">
              <thead><tr><Th>{L.type}</Th><Th>{L.count}</Th><Th>{L.amount}</Th></tr></thead>
              <tbody>
                {Object.entries(itg.transactionsSummary.byType)
                  .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
                  .map(([type, v]) => (
                    <tr key={type} className="border-t" style={{ borderColor: 'var(--border)' }}>
                      <Td mono>{type}</Td><Td right>{v.count}</Td><Td right mono>{v.totalAmount.toFixed(2)}</Td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {(() => {
            const mismatches = diag.transactionDiags.filter(d => d.amountMismatch)
            if (mismatches.length === 0) return null
            return (
              <div className="rounded-lg p-3 text-xs mt-2"
                style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                <p className="font-semibold">{mismatches.length} {L.mismatchCount}:</p>
                {mismatches.slice(0, 5).map((d, i) => (
                  <p key={i}>{d.type} {d.date} — {d.amount.toFixed(2)} vs {d.entries[0]?.amount.toFixed(2) ?? '?'}</p>
                ))}
              </div>
            )
          })()}

          {/* ── 3. ОБОРОТНАЯ ВЕДОМОСТЬ ────────────────────── */}
          <SectionTitle title={L.secTrialBal} />

          <div className="rounded-lg p-3 text-xs mb-2"
            style={{
              backgroundColor: diag.trialBalanceCheck.isEqual ? '#dcfce7' : '#fef2f2',
              color: diag.trialBalanceCheck.isEqual ? '#15803d' : '#dc2626',
              border: `1px solid ${diag.trialBalanceCheck.isEqual ? '#86efac' : '#fca5a5'}`,
            }}>
            {diag.trialBalanceCheck.isEqual
              ? `${L.trialIdentity}: ${L.debit} = ${L.credit} = ${diag.trialBalanceCheck.totalDebit.toFixed(2)}`
              : `${L.violated}! ${L.debit}: ${diag.trialBalanceCheck.totalDebit.toFixed(2)} ≠ ${L.credit}: ${diag.trialBalanceCheck.totalCredit.toFixed(2)}`
            }
          </div>

          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <Th>{L.account}</Th><Th>{L.name}</Th><Th>{L.accType}</Th>
                  <Th>{L.turnDt}</Th><Th>{L.turnCt}</Th><Th>{L.balance}</Th><Th>{L.side}</Th>
                </tr>
              </thead>
              <tbody>
                {diag.trialBalance.map(r => (
                  <tr key={r.account} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <Td mono>{r.account}</Td>
                    <Td>{r.accountLabel}</Td>
                    <Td>
                      <span className="text-[10px] px-1 py-0.5 rounded" style={{
                        backgroundColor: r.accountType === 'active' ? '#dbeafe' : r.accountType === 'passive' ? '#fce7f3' : r.accountType === 'active-passive' ? '#fef3c7' : r.accountType === 'expense' ? '#fee2e2' : '#dcfce7',
                        color: r.accountType === 'active' ? '#1d4ed8' : r.accountType === 'passive' ? '#be185d' : r.accountType === 'active-passive' ? '#92400e' : r.accountType === 'expense' ? '#dc2626' : '#15803d',
                      }}>{r.accountType}</span>
                    </Td>
                    <Td right mono>{r.debitTurnover.toFixed(2)}</Td>
                    <Td right mono>{r.creditTurnover.toFixed(2)}</Td>
                    <Td right mono><span style={{ fontWeight: 600 }}>{Math.abs(r.closingBalance).toFixed(2)}</span></Td>
                    <Td><span style={{ color: r.balanceSide === 'debit' ? '#1d4ed8' : r.balanceSide === 'credit' ? '#be185d' : '#6b7280', fontWeight: 600 }}>
                      {r.balanceSide === 'debit' ? 'Дт' : r.balanceSide === 'credit' ? 'Кт' : '—'}
                    </span></Td>
                  </tr>
                ))}
                <tr className="border-t font-semibold" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
                  <Td><strong>{L.total}</strong></Td><Td>{''}</Td><Td>{''}</Td>
                  <Td right mono>{diag.trialBalanceCheck.totalDebit.toFixed(2)}</Td>
                  <Td right mono>{diag.trialBalanceCheck.totalCredit.toFixed(2)}</Td>
                  <Td>{''}</Td><Td>{''}</Td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── 4. ОПР ────────────────────────────────────── */}
          <SectionTitle title={L.secOPR} />
          {([
            [L.totalRevenue,   itg.oprResult.totalRevenue],
            [L.totalExpenses,  itg.oprResult.totalExpenses],
            [L.financialResult,itg.oprResult.financialResult],
            [L.nonDeductible,  itg.oprResult.nonDeductible],
            [L.taxableProfit,  itg.oprResult.taxableProfit],
            [L.corpTax,        itg.oprResult.corporateTax],
            [L.netProfit,      itg.oprResult.netProfit],
          ] as [string, number][]).map(([label, val]) => (
            <Row key={label} label={label} value={val} mono />
          ))}

          {/* ── 5. БАЛАНС ─────────────────────────────────── */}
          <SectionTitle title={L.secBalance} />

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: '#1d4ed8' }}>{L.assets}</h3>
              {diag.manualBalance.assets.map((a, i) => (
                <div key={i} className="flex justify-between text-xs py-0.5">
                  <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{a.account}</span>
                  <span className="font-mono" style={{ color: a.amount < 0 ? '#dc2626' : 'var(--text-primary)' }}>{a.amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs font-bold mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <span>{L.totalLabel}</span><span className="font-mono">{diag.manualBalance.totalAssets.toFixed(2)}</span>
              </div>
            </div>
            <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: '#be185d' }}>{L.liabilities}</h3>
              {diag.manualBalance.liabilities.map((l, i) => (
                <div key={i} className="flex justify-between text-xs py-0.5">
                  <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{l.account}</span>
                  <span className="font-mono">{l.amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs py-0.5" style={{ color: 'var(--text-muted)' }}>
                <span>{L.manualNetProfit}</span><span className="font-mono">{diag.manualBalance.netProfit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <span>{L.totalLabel}</span><span className="font-mono">{diag.manualBalance.totalPassive.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border mt-3" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-xs">
              <thead><tr><Th>{L.indicator}</Th><Th>{L.manual}</Th><Th>{L.system}</Th><Th>{L.diff}</Th></tr></thead>
              <tbody>
                {diag.comparison.map((c, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: 'var(--border)', backgroundColor: c.diff > 0.01 ? '#fef2f2' : 'transparent' }}>
                    <Td>{c.field}</Td>
                    <Td right mono>{c.manual.toFixed(2)}</Td>
                    <Td right mono>{c.system.toFixed(2)}</Td>
                    <Td right mono><span style={{ color: c.diff > 0.01 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{c.diff > 0.01 ? c.diff.toFixed(2) : 'OK'}</span></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── 6. ПРОВЕРКИ ───────────────────────────────── */}
          <SectionTitle title={L.secChecks} />
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-xs">
              <thead><tr><Th>{L.id}</Th><Th>{L.check}</Th><Th>{L.status}</Th><Th>{L.expected}</Th><Th>{L.actual}</Th><Th>{L.details}</Th></tr></thead>
              <tbody>
                {itg.checks.map(c => (
                  <tr key={c.id} className="border-t" style={{
                    borderColor: 'var(--border)',
                    backgroundColor: c.skipped ? 'transparent' : c.passed ? 'transparent' : '#fef2f2',
                    opacity: c.skipped ? 0.55 : 1,
                  }}>
                    <Td mono>{c.id}</Td><Td>{c.name}</Td>
                    <Td><span style={{ color: c.skipped ? '#6b7280' : c.passed ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                      {c.skipped ? 'SKIP' : c.passed ? 'PASS' : 'FAIL'}
                    </span></Td>
                    <Td mono>{c.expected}</Td><Td mono>{c.actual}</Td><Td>{c.details ?? '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── 7. ОШИБКИ ─────────────────────────────────── */}
          {itg.failedChecks > 0 && (
            <>
              <SectionTitle title={L.secErrors} />
              <div className="rounded-lg p-4 text-xs space-y-2" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                {itg.checks.filter(c => !c.passed && !c.skipped).map(c => (
                  <div key={c.id}>
                    <p className="font-semibold">{c.id}: {c.name}</p>
                    <p>{L.expected}: {c.expected}</p>
                    <p>{L.actual}: {c.actual}</p>
                    {c.details && <p>{L.reason}: {c.details}</p>}
                  </div>
                ))}
              </div>
            </>
          )}

          {(() => {
            const diffs = diag.comparison.filter(c => c.diff > 0.01)
            if (diffs.length === 0) return null
            return (
              <>
                {itg.failedChecks === 0 && <SectionTitle title={L.secBalanceDiff} />}
                <div className="rounded-lg p-4 text-xs space-y-1" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                  <p className="font-semibold">{diffs.length} {L.diffCount}:</p>
                  {diffs.map((d, i) => (
                    <p key={i}>{d.field}: {L.manual}={d.manual.toFixed(2)}, {L.system}={d.system.toFixed(2)}, {L.diff}={d.diff.toFixed(2)}</p>
                  ))}
                </div>
              </>
            )
          })()}

          {/* ── 8. СКАЧИВАНИЕ ─────────────────────────────── */}
          <div className="flex flex-wrap gap-3 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => downloadFullJson(result)}
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}>{L.dlFull}</button>
            <button onClick={() => downloadTrialBalanceCsv(diag, result.periodLabel)}
              className="rounded-lg px-4 py-2 text-sm"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{L.dlTrialBal}</button>
            <button onClick={() => downloadComparisonCsv(diag, result.periodLabel)}
              className="rounded-lg px-4 py-2 text-sm"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{L.dlComparison}</button>
            <button onClick={() => downloadChecksCsv(itg, result.periodLabel)}
              className="rounded-lg px-4 py-2 text-sm"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{L.dlChecks}</button>
          </div>

        </div>
      )}
    </div>
  )
}

// ─── Download helpers ─────────────────────────────────────────────────────────

function fileTag(periodLabel: string) {
  return periodLabel.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '')
}

function downloadFullJson(result: FullAuditResult) {
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `full_audit_${fileTag(result.periodLabel)}_${result.integration.company.eik}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function downloadTrialBalanceCsv(diag: AccountingDiagnosticsResult, periodLabel: string) {
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`
  const header = ['Код сметка','Наименование','Тип','Оборот Дт','Оборот Кт','Крайно салдо','Страна'].map(q).join(';')
  const rows = diag.trialBalance.map(r => [
    q(r.account), q(r.accountLabel), q(r.accountType),
    q(r.debitTurnover.toFixed(2)), q(r.creditTurnover.toFixed(2)),
    q(Math.abs(r.closingBalance).toFixed(2)),
    q(r.balanceSide === 'debit' ? 'Дт' : r.balanceSide === 'credit' ? 'Кт' : '—'),
  ].join(';'))
  rows.push([q('ИТОГО'),q(''),q(''),q(diag.trialBalanceCheck.totalDebit.toFixed(2)),q(diag.trialBalanceCheck.totalCredit.toFixed(2)),q(''),q('')].join(';'))
  const csv = '\uFEFF' + [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `trial_balance_${fileTag(periodLabel)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function downloadComparisonCsv(diag: AccountingDiagnosticsResult, periodLabel: string) {
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`
  const header = ['Показател','Ръчно','Системно','Разлика'].map(q).join(';')
  const rows = diag.comparison.map(c => [q(c.field), q(c.manual.toFixed(2)), q(c.system.toFixed(2)), q(c.diff > 0.01 ? c.diff.toFixed(2) : 'OK')].join(';'))
  const csv = '\uFEFF' + [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `balance_comparison_${fileTag(periodLabel)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function downloadChecksCsv(itg: IntegrationTestResult, periodLabel: string) {
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`
  const header = ['ID','Проверка','Статус','Ожидаемо','Фактично','Детали'].map(q).join(';')
  const rows = itg.checks.map(c => [q(c.id), q(c.name), q(c.skipped ? 'SKIP' : c.passed ? 'PASS' : 'FAIL'), q(c.expected), q(c.actual), q(c.details ?? '')].join(';'))
  const csv = '\uFEFF' + [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `checks_${fileTag(periodLabel)}_${itg.company.eik}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
