import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wallet, Landmark, TrendingUp, TrendingDown, Activity,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { useUserStore, type AppLanguage } from '../store/userStore'
import { useAccountingStore } from '../store/accountingStore'
import { useEmployeesStore } from '../store/employeesStore'
import { useCompaniesStore } from '../store/companiesStore'
import { useJournalStore } from '../store/journalStore'
import { useLegislationStore } from '../store/legislationStore'
import { useNotificationsStore } from '../store/notificationsStore'
import { useVaultUploadsStore } from '../store/vaultUploadsStore'
import { CALENDAR_EVENTS_2026, type CalendarEvent } from '../constants/calendar-events'
import { getUpcomingEvents, getOverdueEvents, getDateLocale } from '../lib/calendarUtils'
import { buildAuditReport } from '../lib/riskEngine'
import { buildOPR, buildBalanceSheet } from '../lib/financialReports'
import { format } from 'date-fns'

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

type PeriodMode = 'month' | 'quarter' | 'year'

interface PeriodRange {
  from: string       // 'YYYY-MM-DD'
  to: string         // 'YYYY-MM-DD'
  prevFrom: string
  prevTo: string
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function computePeriodRange(mode: PeriodMode, today: Date): PeriodRange {
  const y = today.getFullYear()
  const m = today.getMonth()

  if (mode === 'month') {
    const from = new Date(y, m, 1)
    const to = new Date(y, m + 1, 0)
    const prevFrom = new Date(y, m - 1, 1)
    const prevTo = new Date(y, m, 0)
    return { from: isoDate(from), to: isoDate(to), prevFrom: isoDate(prevFrom), prevTo: isoDate(prevTo) }
  }
  if (mode === 'quarter') {
    const qStart = Math.floor(m / 3) * 3
    const from = new Date(y, qStart, 1)
    const to = new Date(y, qStart + 3, 0)
    const prevFrom = new Date(y, qStart - 3, 1)
    const prevTo = new Date(y, qStart, 0)
    return { from: isoDate(from), to: isoDate(to), prevFrom: isoDate(prevFrom), prevTo: isoDate(prevTo) }
  }
  const from = new Date(y, 0, 1)
  const to = new Date(y, 11, 31)
  const prevFrom = new Date(y - 1, 0, 1)
  const prevTo = new Date(y - 1, 11, 31)
  return { from: isoDate(from), to: isoDate(to), prevFrom: isoDate(prevFrom), prevTo: isoDate(prevTo) }
}

function fmtEUR(n: number, decimals = 0): string {
  const rounded = decimals === 0 ? Math.round(n) : Number(n.toFixed(decimals))
  return `${rounded.toLocaleString('bg-BG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} €`
}

function priorMonthKey(today: Date): string {
  const d = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

function priorMonthRange(today: Date): { from: string; to: string } {
  const d = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const end = new Date(today.getFullYear(), today.getMonth(), 0)
  return { from: isoDate(d), to: isoDate(end) }
}

function ytdRange(today: Date): { from: string; to: string } {
  return { from: `${today.getFullYear()}-01-01`, to: isoDate(today) }
}

function daysSince(dateIso: string, today: Date): number {
  const d = new Date(dateIso)
  return Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}

/* -------------------------------------------------------------------------- */
/* i18n                                                                       */
/* -------------------------------------------------------------------------- */

const tr = {
  netProfit: {
    ru: 'Чистая прибыль', en: 'Net profit', bg: 'Чиста печалба', uk: 'Чистий прибуток',
  },
  cash: {
    ru: 'Денежные средства', en: 'Cash', bg: 'Парични средства', uk: 'Грошові кошти',
  },
  cashHint: {
    ru: 'Остаток по сч. 503', en: 'Account 503 balance', bg: 'Салдо сч. 503', uk: 'Залишок сч. 503',
  },
  budgetDue: {
    ru: 'Задолженности бюджету', en: 'Budget dues', bg: 'Задължения към бюджета', uk: 'Заборгованість бюджету',
  },
  allPaid: {
    ru: 'Всичко платено ✓', en: 'All paid ✓', bg: 'Всичко платено ✓', uk: 'Все сплачено ✓',
  },
  healthScore: {
    ru: 'Индекс здоровья', en: 'Health score', bg: 'Индекс здравие', uk: 'Індекс здоров\'я',
  },
  period_month: { ru: 'Месяц', en: 'Month', bg: 'Месец', uk: 'Місяць' },
  period_quarter: { ru: 'Квартал', en: 'Quarter', bg: 'Тримесечие', uk: 'Квартал' },
  period_year: { ru: 'Год', en: 'Year', bg: 'Година', uk: 'Рік' },
  incomeLbl: { ru: 'Приходи', en: 'Income', bg: 'Приходи', uk: 'Доходи' },
  expenseLbl: { ru: 'Разходи', en: 'Expenses', bg: 'Разходи', uk: 'Витрати' },
  discipline: {
    ru: 'Учётная дисциплина', en: 'Accounting Discipline',
    bg: 'Счетоводна дисциплина', uk: 'Облікова дисципліна',
  },
  activity: { ru: 'Активность', en: 'Activity', bg: 'Активност', uk: 'Активність' },
  opsThisMonth: {
    ru: 'Операций за месяц', en: 'Operations this month',
    bg: 'Операции за месеца', uk: 'Операцій за місяць',
  },
  lastOp: { ru: 'Последняя операция', en: 'Last operation', bg: 'Последна операция', uk: 'Остання операція' },
  pendingApproval: {
    ru: 'Ожидают утверждения', en: 'Awaiting approval',
    bg: 'Чакат одобрение', uk: 'Очікують затвердження',
  },
  journalEntries: {
    ru: 'Проводок за месяц', en: 'Journal entries this month',
    bg: 'Счетоводни записи за месеца', uk: 'Проведень за місяць',
  },
  manual: { ru: 'ручных', en: 'manual', bg: 'ръчни', uk: 'ручних' },
  noActivity: {
    ru: 'Нет данных', en: 'No data', bg: 'Няма данни', uk: 'Немає даних',
  },
  reporting: { ru: 'Отчётность', en: 'Reporting', bg: 'Отчетност', uk: 'Звітність' },
  colReport: { ru: 'Отчёт', en: 'Report', bg: 'Отчет', uk: 'Звіт' },
  colDeadline: { ru: 'Срок', en: 'Deadline', bg: 'Срок', uk: 'Термін' },
  colStatus: { ru: 'Статус', en: 'Status', bg: 'Статус', uk: 'Статус' },
  colDetails: { ru: 'Действие', en: 'Action', bg: 'Действие', uk: 'Дія' },
  statusSubmitted: { ru: 'Подадено', en: 'Submitted', bg: 'Подадено', uk: 'Подано' },
  statusUpcoming: { ru: 'Предстои', en: 'Upcoming', bg: 'Предстои', uk: 'Майбутнє' },
  statusOverdue: { ru: 'Просрочено', en: 'Overdue', bg: 'Просрочено', uk: 'Прострочено' },
  statusUnknown: { ru: 'Нет данных', en: 'No data', bg: 'Няма данни', uk: 'Немає даних' },
  allDeadlines: { ru: 'Все сроки →', en: 'All deadlines →', bg: 'Всички срокове →', uk: 'Усі терміни →' },
  generateXml: { ru: 'Генерировать XML', en: 'Generate XML', bg: 'Генерирай XML', uk: 'Згенерувати XML' },
  generate: { ru: 'Генерировать', en: 'Generate', bg: 'Генерирай', uk: 'Згенерувати' },
  addPayment: { ru: 'Внести платёж', en: 'Add payment', bg: 'Внеси плащане', uk: 'Додати платіж' },
  taxesBlock: { ru: 'Налоги и платежи', en: 'Taxes & Payments', bg: 'Данъци и плащания', uk: 'Податки та платежі' },
  colPayment: { ru: 'Платёж', en: 'Payment', bg: 'Плащане', uk: 'Платіж' },
  colPeriod: { ru: 'Период', en: 'Period', bg: 'Период', uk: 'Період' },
  colDue: { ru: 'Дължима сума', en: 'Amount due', bg: 'Дължима сума', uk: 'Сума до сплати' },
  colPaymentStatus: { ru: 'Статус', en: 'Status', bg: 'Статус', uk: 'Статус' },
  dds: { ru: 'ДДС', en: 'VAT', bg: 'ДДС', uk: 'ПДВ' },
  osig: { ru: 'Осигуровки', en: 'Social insurance', bg: 'Осигуровки', uk: 'Соц. внески' },
  zkpo: { ru: 'ЗКПО (корп. данък)', en: 'Corporate tax', bg: 'ЗКПО', uk: 'Податок на прибуток' },
  forecast: { ru: 'Прогнозно', en: 'Estimated', bg: 'Прогнозно', uk: 'Прогнозно' },
  noPayData: {
    ru: '❓ Няма данни за плащане', en: '❓ No payment data',
    bg: '❓ Няма данни за плащане', uk: '❓ Немає даних про платіж',
  },
  noPayHint: {
    ru: 'Если уплачено — внесите расход типа "Данъци" в бухгалтерию',
    en: 'If paid, add a "Tax" expense in accounting',
    bg: 'Ако е платено — добавете разход тип "Данъци" в счетоводството',
    uk: 'Якщо сплачено — додайте витрату типу "Податки" в бухгалтерію',
  },
  dividendsBlock: { ru: 'Дивидент', en: 'Dividends', bg: 'Дивидент', uk: 'Дивіденди' },
  canTakeUpTo: {
    ru: 'Можете взять до', en: 'You can take up to',
    bg: 'Можете да вземете до', uk: 'Можна взяти до',
  },
  dividendTax: { ru: 'Данък 5%', en: 'Tax 5%', bg: 'Данък 5%', uk: 'Податок 5%' },
  dividendNet: { ru: 'На руки', en: 'Net', bg: 'На ръка', uk: 'На руки' },
  calcDetail: {
    ru: 'Изчисли подробно', en: 'Calculate in detail',
    bg: 'Изчисли подробно', uk: 'Розрахувати детально',
  },
  noDividend: {
    ru: 'Дивидент не възможен — няма достатъчна печалба',
    en: 'Dividend not possible — insufficient profit',
    bg: 'Дивидент не е възможен — няма достатъчна печалба',
    uk: 'Дивіденди неможливі — недостатньо прибутку',
  },
  dividendHistory: {
    ru: 'История выплат', en: 'Payout history',
    bg: 'История на изплащанията', uk: 'Історія виплат',
  },
  bizValue: { ru: 'Стоимость бизнеса', en: 'Business value', bg: 'Стойност на бизнеса', uk: 'Вартість бізнесу' },
  netAssets: { ru: 'Чистые активы', en: 'Net assets', bg: 'Нетни активи', uk: 'Чисті активи' },
  annualProfit: {
    ru: 'Годовая прибыль (12 мес)', en: 'Annual profit (12mo)',
    bg: 'Годишна печалба (12 мес)', uk: 'Річний прибуток (12 міс)',
  },
  estValue: {
    ru: 'Ориентировочная стоимость', en: 'Estimated value',
    bg: 'Ориентировъчна стойност', uk: 'Орієнтовна вартість',
  },
  disclaimer: {
    ru: 'Приблизительная оценка для ориентира. Реальная стоимость определяется при сделке купли-продажи.',
    en: 'Rough estimate only. Actual value is determined at the sale transaction.',
    bg: 'Ориентировъчна оценка. Реалната стойност се определя при сделката.',
    uk: 'Приблизна оцінка. Реальна вартість визначається при операції купівлі-продажу.',
  },
  notOfficial: {
    ru: '⚠ Не официальна оценка', en: '⚠ Not an official valuation',
    bg: '⚠ Не е официална оценка', uk: '⚠ Не офіційна оцінка',
  },
  emptyTitle: {
    ru: 'Добавьте первую операцию чтобы увидеть состояние бизнеса',
    en: 'Add your first transaction to see your business status',
    bg: 'Добавете първа операция, за да видите състоянието на бизнеса',
    uk: 'Додайте першу операцію, щоб побачити стан бізнесу',
  },
  addIncome: { ru: 'Добавить приход', en: 'Add income', bg: 'Добави приход', uk: 'Додати дохід' },
  addExpense: { ru: 'Добавить расход', en: 'Add expense', bg: 'Добави разход', uk: 'Додати витрату' },
  vsPrev: {
    ru: 'к прошлому', en: 'vs prev', bg: 'спрямо минал', uk: 'до поперед.',
  },
  daysAgo: {
    ru: (n: number) => `${n} дн. назад`,
    en: (n: number) => `${n}d ago`,
    bg: (n: number) => `преди ${n} дни`,
    uk: (n: number) => `${n} дн. тому`,
  },
  urgent: {
    ru: 'Срочные напоминания', en: 'Urgent reminders',
    bg: 'Спешни напомняния', uk: 'Термінові нагадування',
  },
  moreThanLast: {
    ru: 'больше', en: 'more', bg: 'повече', uk: 'більше',
  },
  lessThanLast: {
    ru: 'меньше', en: 'less', bg: 'по-малко', uk: 'менше',
  },
} as const

function pick<K extends keyof typeof tr>(key: K, lang: AppLanguage): string {
  const entry = tr[key] as Record<AppLanguage, string>
  return entry[lang] ?? entry.ru
}

function pickFn(
  key: 'daysAgo',
  lang: AppLanguage,
): (n: number) => string {
  const entry = tr[key] as Record<AppLanguage, (n: number) => string>
  return entry[lang] ?? entry.ru
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function OwnerDashboard() {
  const navigate = useNavigate()
  const today = useMemo(() => new Date(), [])

  const { legalForm, companyName, taxPeriod, hasVat, hasEmployees, eik, language } = useUserStore()
  const transactions = useAccountingStore((s) => s.transactions)
  const getPending = useAccountingStore((s) => s.getPendingTransactions)
  const employees = useEmployeesStore((s) => s.employees)
  const activeCompanyId = useCompaniesStore((s) => s.activeCompanyId)
  const pendingCorrectionsCount = useLegislationStore((s) =>
    activeCompanyId ? s.getPendingCorrectionsCount(activeCompanyId) : 0,
  )
  const journalEntries = useJournalStore((s) => s.entries)
  const bankBalance503 = useJournalStore((s) => s.bankBalance)
  const notifications = useNotificationsStore((s) => s.notifications)
  // Use stable selector (count, not filtered array) to avoid new-reference infinite loop
  const allUploads = useVaultUploadsStore((s) => s.uploads)
  const vaultUploads = activeCompanyId
    ? allUploads.filter((u) => u.companyId === activeCompanyId)
    : allUploads

  const [periodMode, setPeriodMode] = useState<PeriodMode>('month')
  const [bizExpanded, setBizExpanded] = useState(false)

  const range = useMemo(() => computePeriodRange(periodMode, today), [periodMode, today])

  /* ---- Financial pulse ------------------------------------------------- */

  const income = useMemo(
    () => transactions
      .filter((t) => (t.status === undefined || t.status === 'approved'))
      .filter((t) => t.date >= range.from && t.date <= range.to && !t.isDeferred)
      .filter((t) => ['income', 'vat_out', 'appstore', 'googleplay', 'stripe'].includes(t.type))
      .reduce((s, t) => s + t.amount, 0),
    [transactions, range.from, range.to],
  )
  const expenses = useMemo(
    () => transactions
      .filter((t) => (t.status === undefined || t.status === 'approved'))
      .filter((t) => t.date >= range.from && t.date <= range.to && !t.isDeferred)
      .filter((t) => ['expense', 'vat_in', 'salary', 'dividend', 'depreciation', 'vehicle_tax', 'vehicle_expense'].includes(t.type))
      .reduce((s, t) => s + (t.type === 'vehicle_expense' ? t.amount * (t.deductiblePercent ?? 0.5) : t.amount), 0),
    [transactions, range.from, range.to],
  )
  const profit = income - expenses

  const prevIncome = useMemo(
    () => transactions
      .filter((t) => (t.status === undefined || t.status === 'approved'))
      .filter((t) => t.date >= range.prevFrom && t.date <= range.prevTo && !t.isDeferred)
      .filter((t) => ['income', 'vat_out', 'appstore', 'googleplay', 'stripe'].includes(t.type))
      .reduce((s, t) => s + t.amount, 0),
    [transactions, range.prevFrom, range.prevTo],
  )
  const prevExpenses = useMemo(
    () => transactions
      .filter((t) => (t.status === undefined || t.status === 'approved'))
      .filter((t) => t.date >= range.prevFrom && t.date <= range.prevTo && !t.isDeferred)
      .filter((t) => ['expense', 'vat_in', 'salary', 'dividend', 'depreciation', 'vehicle_tax', 'vehicle_expense'].includes(t.type))
      .reduce((s, t) => s + (t.type === 'vehicle_expense' ? t.amount * (t.deductiblePercent ?? 0.5) : t.amount), 0),
    [transactions, range.prevFrom, range.prevTo],
  )
  const prevProfit = prevIncome - prevExpenses

  const profitDelta = prevProfit !== 0
    ? ((profit - prevProfit) / Math.abs(prevProfit)) * 100
    : (profit !== 0 ? 100 : 0)

  /* ---- Cash balance ---------------------------------------------------- */

  const cashFromJournal = useMemo(() => {
    const debit = journalEntries
      .filter((e) => e.debitAccount === '503' && (!activeCompanyId || !e.companyId || e.companyId === activeCompanyId))
      .reduce((s, e) => s + e.amount, 0)
    const credit = journalEntries
      .filter((e) => e.creditAccount === '503' && (!activeCompanyId || !e.companyId || e.companyId === activeCompanyId))
      .reduce((s, e) => s + e.amount, 0)
    return debit - credit
  }, [journalEntries, activeCompanyId])

  const cash = cashFromJournal !== 0 ? cashFromJournal : bankBalance503

  /* ---- Audit health score --------------------------------------------- */

  const report = useMemo(
    () => buildAuditReport({
      legalForm, companyName, taxPeriod, hasVat, hasEmployees,
      transactions, employees, eik, pendingCorrectionsCount,
    }),
    [legalForm, companyName, taxPeriod, hasVat, hasEmployees, transactions, employees, eik, pendingCorrectionsCount],
  )

  /* ---- Budget dues (prior month VAT, social, corp) ------------------- */

  const priorMonth = useMemo(() => priorMonthRange(today), [today])
  const vatDue = useMemo(() => {
    const vatOut = transactions
      .filter((t) => t.type === 'vat_out' && t.date >= priorMonth.from && t.date <= priorMonth.to)
      .reduce((s, t) => s + (t.vatAmount ?? 0), 0)
    const vatIn = transactions
      .filter((t) => t.type === 'vat_in' && t.date >= priorMonth.from && t.date <= priorMonth.to)
      .reduce((s, t) => s + (t.vatAmount ?? 0), 0)
    return Math.max(vatOut - vatIn, 0)
  }, [transactions, priorMonth.from, priorMonth.to])

  const socialDue = useMemo(() => {
    if (!hasEmployees && legalForm !== 'self') return 0
    return transactions
      .filter((t) => t.type === 'salary' && t.date >= priorMonth.from && t.date <= priorMonth.to)
      .reduce((s, t) => s + t.amount * 0.328, 0) // approximate ER+EE burden
  }, [transactions, priorMonth.from, priorMonth.to, hasEmployees, legalForm])

  const ytd = useMemo(() => ytdRange(today), [today])
  const oprYtd = useMemo(
    () => buildOPR(journalEntries, transactions, ytd.from, ytd.to, companyName, 0),
    [journalEntries, transactions, ytd.from, ytd.to, companyName],
  )
  const corpTaxDue = legalForm === 'ood' && today.getMonth() >= 2 ? Math.max(oprYtd.corporateTax, 0) : 0

  const totalBudgetDue =
    (hasVat ? vatDue : 0) +
    socialDue +
    corpTaxDue

  /* ---- Block 2.1 Activity --------------------------------------------- */

  const monthFrom = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`
  const monthTo = isoDate(new Date(today.getFullYear(), today.getMonth() + 1, 0))
  const prevMonthFrom = `${today.getFullYear()}-${pad(today.getMonth())}-01`
  const prevMonthTo = isoDate(new Date(today.getFullYear(), today.getMonth(), 0))

  const opsThisMonth = transactions.filter(
    (t) => t.date >= monthFrom && t.date <= monthTo &&
      (t.status === undefined || t.status === 'approved'),
  ).length
  const opsPrevMonth = transactions.filter(
    (t) => t.date >= prevMonthFrom && t.date <= prevMonthTo &&
      (t.status === undefined || t.status === 'approved'),
  ).length
  const opsDelta = opsThisMonth - opsPrevMonth

  const lastOpTx = useMemo(() => {
    return [...transactions]
      .filter((t) => t.status === undefined || t.status === 'approved')
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0]
  }, [transactions])
  const lastOpDays = lastOpTx ? daysSince(lastOpTx.date, today) : null
  const lastOpStale = lastOpDays !== null && lastOpDays > 7

  const pendingTxs = getPending()
  const oldestPendingDays = useMemo(() => {
    if (pendingTxs.length === 0) return 0
    return Math.max(...pendingTxs.map((t) => daysSince(t.date, today)))
  }, [pendingTxs, today])
  const pendingCritical = pendingTxs.length > 0 && oldestPendingDays > 3

  const entriesThisMonth = journalEntries.filter((e) => e.date >= monthFrom && e.date <= monthTo).length
  const manualEntriesThisMonth = journalEntries.filter(
    (e) => e.date >= monthFrom && e.date <= monthTo && (e.source === 'manual' || e.isManuallyEdited),
  ).length

  /* ---- Block 2.2 Reporting checklist ----------------------------------- */

  type ReportRow = {
    event: CalendarEvent
    date: Date
    daysUntil: number    // positive for upcoming, negative for overdue
    status: 'submitted' | 'upcoming' | 'overdue' | 'unknown'
    action?: 'dds' | 'obrazec1' | 'payment'
  }

  const reportRows: ReportRow[] = useMemo(() => {
    const upcoming = getUpcomingEvents(CALENDAR_EVENTS_2026, legalForm, 60)
      .map((x) => ({ event: x.event, date: x.date, daysUntil: x.daysUntil }))
    const overdue = getOverdueEvents(CALENDAR_EVENTS_2026, legalForm)
      .map((x) => ({ event: x.event, date: x.date, daysUntil: -x.daysOverdue }))

    // Dedup by event.id — prefer overdue occurrence then nearest upcoming
    const seen = new Set<string>()
    const rows: { event: CalendarEvent; date: Date; daysUntil: number }[] = []
    ;[...overdue, ...upcoming].forEach((r) => {
      if (seen.has(r.event.id)) return
      seen.add(r.event.id)
      rows.push(r)
    })

    function determineStatus(r: { event: CalendarEvent; date: Date; daysUntil: number }): {
      status: ReportRow['status']
      action?: ReportRow['action']
    } {
      const cat = r.event.category
      // Compute the period that this event refers to
      let periodKey: string | null = null
      if (r.event.recurrence === 'monthly') {
        const d = new Date(r.date.getFullYear(), r.date.getMonth() - 1, 1)
        periodKey = `${d.getFullYear()}_${pad(d.getMonth() + 1)}`
      } else if (r.event.recurrence === 'annual' || r.event.recurrence === 'quarterly') {
        periodKey = String(r.date.getFullYear() - 1)
      }

      // DDS events — check vault for DDS_YYYY_MM.xml or vat transactions
      if (cat === 'vat' && periodKey) {
        const match = vaultUploads.some((u) => u.fileName.toLowerCase().startsWith('dds_') && u.fileName.includes(periodKey!))
        if (match) return { status: 'submitted' }
        return {
          status: r.daysUntil < 0 ? 'overdue' : 'upcoming',
          action: 'dds',
        }
      }

      // Osiguvrovki / Payroll — check for salary transaction in that period OR Obrazec1 in vault
      if (cat === 'social' && periodKey) {
        const periodIso = `${periodKey.split('_')[0]}-${periodKey.split('_')[1]}`
        const salaryTx = transactions.some(
          (t) => t.type === 'salary' && t.date.startsWith(periodIso),
        )
        const vaultObr = vaultUploads.some(
          (u) => u.fileName.toLowerCase().startsWith('obrazec1') && u.fileName.includes(periodKey!),
        )
        if (salaryTx || vaultObr) return { status: 'submitted' }
        return {
          status: r.daysUntil < 0 ? 'overdue' : 'upcoming',
          action: 'obrazec1',
        }
      }

      // Corporate / advance / registry / statistical — check vault folder
      if (cat === 'corporate' || cat === 'registry' || cat === 'statistical' || cat === 'advance') {
        const year = periodKey ?? String(r.date.getFullYear())
        const match = vaultUploads.some(
          (u) => (u.folderPath.includes(year) || u.fileName.includes(year)) &&
            (u.folderPath.toLowerCase().includes('zkpo') || u.folderPath.toLowerCase().includes('02_tax') ||
              u.folderPath.toLowerCase().includes('03_financial') || u.folderPath.toLowerCase().includes('nsi') ||
              u.folderPath.toLowerCase().includes('brra')),
        )
        if (match) return { status: 'submitted' }
        return {
          status: r.daysUntil < 0 ? 'overdue' : 'upcoming',
          action: 'payment',
        }
      }

      // Salary payment events — check for salary tx in prior month
      if (cat === 'salary' && periodKey) {
        const periodIso = `${periodKey.split('_')[0]}-${periodKey.split('_')[1]}`
        const salaryTx = transactions.some((t) => t.type === 'salary' && t.date.startsWith(periodIso))
        if (salaryTx) return { status: 'submitted' }
        return { status: r.daysUntil < 0 ? 'overdue' : 'upcoming', action: 'payment' }
      }

      // KEP / other — we can't verify
      return { status: 'unknown' }
    }

    return rows
      .map((r) => {
        const { status, action } = determineStatus(r)
        return { ...r, status, action } as ReportRow
      })
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 10)
  }, [legalForm, vaultUploads, transactions])

  /* ---- Dividends (ood only) ------------------------------------------- */

  const dividendsPaid = useMemo(
    () => transactions
      .filter((t) => t.type === 'dividend')
      .reduce((s, t) => s + t.amount, 0),
    [transactions],
  )
  const dividendHistory = useMemo(
    () => [...transactions]
      .filter((t) => t.type === 'dividend')
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 5),
    [transactions],
  )
  const maxDividend = Math.max(oprYtd.netProfit - dividendsPaid, 0)
  const dividendTax = maxDividend * 0.05
  const dividendNet = maxDividend - dividendTax

  /* ---- Business value (collapsible) ------------------------------------ */

  const balance = useMemo(
    () => buildBalanceSheet(journalEntries, ytd.to, companyName, transactions),
    [journalEntries, ytd.to, companyName, transactions],
  )
  const netAssets = balance.totalAssets - balance.totalLiabilities
  const estValue = Math.max(oprYtd.netProfit * 3, 0)

  /* ---- Urgent notifications ------------------------------------------- */

  const urgentNotifications = notifications
    .filter((n) => !n.dismissedAt && (n.severity === 'critical' || n.severity === 'warning'))
    .sort((a, _b) => (a.severity === 'critical' ? -1 : 1))
    .slice(0, 3)
  const hasCritical = urgentNotifications.some((n) => n.severity === 'critical')

  /* ---- Empty state ----------------------------------------------------- */

  if (transactions.length === 0) {
    return (
      <div className="flex items-center justify-center p-6 min-h-[60vh]">
        <div
          className="max-w-md w-full rounded-2xl p-8 text-center shadow-sm"
          style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}
        >
          <div className="text-5xl mb-4">📊</div>
          <p className="text-base font-medium mb-6" style={{ color: 'var(--text-primary)' }}>
            {pick('emptyTitle', language)}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={() => navigate('/accounting')}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {pick('addIncome', language)}
            </button>
            <button
              onClick={() => navigate('/accounting')}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold"
              style={{
                border: '1.5px solid var(--border)',
                color: 'var(--text-primary)',
                backgroundColor: 'var(--surface)',
              }}
            >
              {pick('addExpense', language)}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ---- Render ---------------------------------------------------------- */

  return (
    <div className="space-y-6 p-6">

      {/* Urgent notifications */}
      {urgentNotifications.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: hasCritical ? 'var(--danger-light)' : '#fffbeb',
            border: `1.5px solid ${hasCritical ? 'var(--danger)' : '#f59e0b'}`,
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold" style={{ color: hasCritical ? 'var(--danger-text)' : '#92400e' }}>
              {hasCritical ? '🔔' : '⏰'} {pick('urgent', language)}
            </p>
            <button
              onClick={() => navigate('/calendar')}
              className="shrink-0 text-xs font-semibold hover:underline"
              style={{ color: hasCritical ? 'var(--danger-text)' : '#92400e' }}
            >
              {pick('allDeadlines', language)}
            </button>
          </div>
          <div className="mt-3 space-y-1.5">
            {urgentNotifications.map((n) => (
              <div key={n.id} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span
                  className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: n.severity === 'critical' ? 'var(--danger)' : '#f59e0b' }}
                />
                <div className="flex-1 min-w-0">
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {n.title}
                  </span>
                  <span className="mx-1">·</span>
                  <span>{n.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {companyName || 'Dashboard'}
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {format(today, 'd MMMM yyyy', { locale: getDateLocale(language) })}
        </p>
      </div>

      {/* ====== SECTION 1: Financial pulse ====== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net profit */}
        <div
          className="rounded-2xl p-5 shadow-sm"
          style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={14} style={{ color: 'var(--text-muted)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                {pick('netProfit', language)}
              </span>
            </div>
          </div>
          <div className="flex gap-1 mb-2">
            {(['month', 'quarter', 'year'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setPeriodMode(m)}
                className="rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors"
                style={{
                  backgroundColor: periodMode === m ? 'var(--accent-light)' : 'transparent',
                  color: periodMode === m ? 'var(--accent-text)' : 'var(--text-muted)',
                }}
              >
                {pick(`period_${m}` as keyof typeof tr, language)}
              </button>
            ))}
          </div>
          <div
            className="text-2xl font-bold"
            style={{ color: profit >= 0 ? 'var(--accent)' : 'var(--danger)' }}
          >
            {fmtEUR(profit)}
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs">
            {profitDelta >= 0 ? (
              <TrendingUp size={12} style={{ color: 'var(--accent)' }} />
            ) : (
              <TrendingDown size={12} style={{ color: 'var(--danger)' }} />
            )}
            <span style={{ color: profitDelta >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
              {profitDelta >= 0 ? '+' : ''}{profitDelta.toFixed(0)}%
            </span>
            <span style={{ color: 'var(--text-muted)' }}>{pick('vsPrev', language)}</span>
          </div>
          <div className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {pick('incomeLbl', language)} {fmtEUR(income)} · {pick('expenseLbl', language)} {fmtEUR(expenses)}
          </div>
        </div>

        {/* Cash */}
        <div
          className="rounded-2xl p-5 shadow-sm"
          style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Wallet size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {pick('cash', language)}
            </span>
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
            {fmtEUR(cash)}
          </div>
          <div className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {pick('cashHint', language)}
          </div>
        </div>

        {/* Budget dues */}
        <div
          className="rounded-2xl p-5 shadow-sm"
          style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Landmark size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {pick('budgetDue', language)}
            </span>
          </div>
          {totalBudgetDue > 0 ? (
            <>
              <div className="text-2xl font-bold" style={{ color: 'var(--danger)' }}>
                {fmtEUR(totalBudgetDue)}
              </div>
              <div className="mt-1 text-[11px] space-y-0.5" style={{ color: 'var(--text-muted)' }}>
                {hasVat && vatDue > 0 && <div>{pick('dds', language)}: {fmtEUR(vatDue)}</div>}
                {socialDue > 0 && <div>{pick('osig', language)}: {fmtEUR(socialDue)}</div>}
                {corpTaxDue > 0 && <div>{pick('zkpo', language)}: {fmtEUR(corpTaxDue)}</div>}
              </div>
            </>
          ) : (
            <div className="text-xl font-semibold" style={{ color: 'var(--accent)' }}>
              {pick('allPaid', language)}
            </div>
          )}
        </div>

        {/* Health score */}
        <button
          onClick={() => navigate('/auditor')}
          className="rounded-2xl p-5 shadow-sm text-left transition-shadow hover:shadow-md"
          style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Activity size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {pick('healthScore', language)}
            </span>
          </div>
          <HealthRing score={report.healthScore} />
        </button>
      </div>

      {/* ====== SECTION 2: Accounting discipline ====== */}
      <section
        className="rounded-2xl p-5"
        style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-primary)' }}>
          {pick('discipline', language)}
        </h2>

        {/* 2.1 Activity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCell
            label={pick('opsThisMonth', language)}
            value={String(opsThisMonth)}
            hint={
              opsDelta === 0
                ? undefined
                : `${opsDelta > 0 ? '↑' : '↓'}${Math.abs(opsDelta)} ${
                    opsDelta > 0 ? pick('moreThanLast', language) : pick('lessThanLast', language)
                  }`
            }
          />
          <StatCell
            label={pick('lastOp', language)}
            value={
              lastOpTx
                ? format(new Date(lastOpTx.date), 'd MMM', { locale: getDateLocale(language) })
                : '—'
            }
            hint={lastOpDays !== null ? pickFn('daysAgo', language)(lastOpDays) : undefined}
            danger={lastOpStale}
          />
          <StatCell
            label={pick('pendingApproval', language)}
            value={String(pendingTxs.length)}
            hint={oldestPendingDays > 0 ? pickFn('daysAgo', language)(oldestPendingDays) : undefined}
            danger={pendingCritical}
          />
          <StatCell
            label={pick('journalEntries', language)}
            value={String(entriesThisMonth)}
            hint={`${manualEntriesThisMonth} ${pick('manual', language)}`}
          />
        </div>

        {/* 2.2 Reporting checklist */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {pick('reporting', language)}
            </h3>
            <button
              onClick={() => navigate('/calendar')}
              className="text-xs font-semibold hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              {pick('allDeadlines', language)}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  <th className="text-left font-medium py-2 px-2">{pick('colReport', language)}</th>
                  <th className="text-left font-medium py-2 px-2">{pick('colDeadline', language)}</th>
                  <th className="text-left font-medium py-2 px-2">{pick('colStatus', language)}</th>
                  <th className="text-left font-medium py-2 px-2">{pick('colDetails', language)}</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.map((row, i) => (
                  <tr
                    key={`${row.event.id}-${i}`}
                    className="border-t"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <td className="py-2 px-2" style={{ color: 'var(--text-primary)' }}>
                      {language === 'bg' ? row.event.title_bg : row.event.title_ru}
                    </td>
                    <td className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>
                      {format(row.date, 'd MMM', { locale: getDateLocale(language) })}
                    </td>
                    <td className="py-2 px-2">
                      <StatusBadge status={row.status} language={language} />
                    </td>
                    <td className="py-2 px-2">
                      {row.status !== 'submitted' && row.action && (
                        <ReportAction action={row.action} language={language} navigate={navigate} />
                      )}
                    </td>
                  </tr>
                ))}
                {reportRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                      {pick('noActivity', language)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2.3 Taxes and payments */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
            {pick('taxesBlock', language)}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  <th className="text-left font-medium py-2 px-2">{pick('colPayment', language)}</th>
                  <th className="text-left font-medium py-2 px-2">{pick('colPeriod', language)}</th>
                  <th className="text-right font-medium py-2 px-2">{pick('colDue', language)}</th>
                  <th className="text-left font-medium py-2 px-2">{pick('colPaymentStatus', language)}</th>
                </tr>
              </thead>
              <tbody>
                {hasVat && (
                  <TaxRow
                    label={pick('dds', language)}
                    period={priorMonthKey(today)}
                    due={vatDue}
                    language={language}
                  />
                )}
                {(hasEmployees || legalForm === 'self') && (
                  <TaxRow
                    label={pick('osig', language)}
                    period={priorMonthKey(today)}
                    due={socialDue}
                    language={language}
                  />
                )}
                {legalForm === 'ood' && today.getMonth() >= 2 && (
                  <TaxRow
                    label={`${pick('zkpo', language)} (${pick('forecast', language)})`}
                    period={String(today.getFullYear())}
                    due={corpTaxDue}
                    language={language}
                  />
                )}
              </tbody>
            </table>
            <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {pick('noPayHint', language)}
            </p>
          </div>
        </div>
      </section>

      {/* ====== SECTION 3: Dividends (ood only) ====== */}
      {legalForm === 'ood' && (
        <DividendsSection
          maxDividend={maxDividend}
          dividendTax={dividendTax}
          dividendNet={dividendNet}
          history={dividendHistory}
          language={language}
          navigate={navigate}
        />
      )}

      {/* ====== SECTION 4: Business value (collapsible) ====== */}
      <section
        className="rounded-2xl p-5"
        style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}
      >
        <button
          onClick={() => setBizExpanded((v) => !v)}
          className="w-full flex items-center justify-between"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
            {pick('bizValue', language)}
          </h2>
          {bizExpanded ? (
            <ChevronUp size={18} style={{ color: 'var(--text-muted)' }} />
          ) : (
            <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />
          )}
        </button>
        {bizExpanded && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCell label={pick('netAssets', language)} value={fmtEUR(netAssets)} />
            <StatCell label={pick('annualProfit', language)} value={fmtEUR(oprYtd.netProfit)} />
            <StatCell label={pick('estValue', language)} value={fmtEUR(estValue)} accent />
            <div className="sm:col-span-3 text-[11px] italic mt-1" style={{ color: 'var(--text-muted)' }}>
              {pick('notOfficial', language)} · {pick('disclaimer', language)}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function HealthRing({ score }: { score: number }) {
  const color = score >= 80 ? 'var(--accent)' : score >= 50 ? '#f59e0b' : 'var(--danger)'
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference

  return (
    <div className="flex items-center gap-3">
      <svg width={72} height={72} viewBox="0 0 72 72">
        <circle cx={36} cy={36} r={radius} fill="none" stroke="var(--border)" strokeWidth={6} />
        <circle
          cx={36}
          cy={36}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 36 36)"
        />
        <text
          x={36}
          y={41}
          textAnchor="middle"
          fontSize={18}
          fontWeight={700}
          fill="var(--text-primary)"
        >
          {score}
        </text>
      </svg>
      <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
        /100
      </div>
    </div>
  )
}

function StatCell({
  label, value, hint, danger, accent,
}: {
  label: string
  value: string
  hint?: string
  danger?: boolean
  accent?: boolean
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        backgroundColor: 'var(--surface)',
        border: `1px solid ${danger ? 'var(--danger)' : 'var(--border)'}`,
      }}
    >
      <div className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div
        className="mt-1 text-lg font-bold"
        style={{ color: danger ? 'var(--danger)' : accent ? 'var(--accent)' : 'var(--text-primary)' }}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 text-[11px]" style={{ color: danger ? 'var(--danger)' : 'var(--text-muted)' }}>
          {hint}
        </div>
      )}
    </div>
  )
}

function StatusBadge({
  status, language,
}: {
  status: 'submitted' | 'upcoming' | 'overdue' | 'unknown'
  language: AppLanguage
}) {
  const cfg = {
    submitted: {
      icon: '✅',
      label: pick('statusSubmitted', language),
      bg: 'var(--accent-light)',
      color: 'var(--accent-text)',
    },
    upcoming: {
      icon: '⏳',
      label: pick('statusUpcoming', language),
      bg: '#fffbeb',
      color: '#92400e',
    },
    overdue: {
      icon: '❌',
      label: pick('statusOverdue', language),
      bg: 'var(--danger-light)',
      color: 'var(--danger-text)',
    },
    unknown: {
      icon: '❓',
      label: pick('statusUnknown', language),
      bg: 'var(--surface)',
      color: 'var(--text-muted)',
    },
  }[status]

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </span>
  )
}

function ReportAction({
  action, language, navigate,
}: {
  action: 'dds' | 'obrazec1' | 'payment'
  language: AppLanguage
  navigate: ReturnType<typeof useNavigate>
}) {
  const [label, target] = (() => {
    if (action === 'dds') return [pick('generateXml', language), '/reports']
    if (action === 'obrazec1') return [pick('generate', language), '/salary']
    return [pick('addPayment', language), '/accounting']
  })()

  return (
    <button
      onClick={() => navigate(target)}
      className="rounded-md px-2 py-1 text-[11px] font-medium"
      style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-text)' }}
    >
      {label}
    </button>
  )
}

function TaxRow({
  label, period, due, language,
}: {
  label: string
  period: string
  due: number
  language: AppLanguage
}) {
  return (
    <tr className="border-t" style={{ borderColor: 'var(--border)' }}>
      <td className="py-2 px-2" style={{ color: 'var(--text-primary)' }}>{label}</td>
      <td className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>{period}</td>
      <td className="py-2 px-2 text-right font-semibold" style={{ color: due > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
        {fmtEUR(due, 2)}
      </td>
      <td className="py-2 px-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
        {pick('noPayData', language)}
      </td>
    </tr>
  )
}

function DividendsSection({
  maxDividend, dividendTax, dividendNet, history, language, navigate,
}: {
  maxDividend: number
  dividendTax: number
  dividendNet: number
  history: { id: string; date: string; amount: number }[]
  language: AppLanguage
  navigate: ReturnType<typeof useNavigate>
}) {
  const possible = maxDividend > 0

  return (
    <section
      className="rounded-2xl p-5"
      style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-primary)' }}>
        {pick('dividendsBlock', language)}
      </h2>

      {possible ? (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {pick('canTakeUpTo', language)}
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: 'var(--accent)' }}>
              {fmtEUR(maxDividend)}
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {pick('dividendTax', language)}: {fmtEUR(dividendTax, 2)} ·{' '}
              {pick('dividendNet', language)}: {fmtEUR(dividendNet, 2)}
            </div>
          </div>
          <button
            onClick={() => navigate('/calculator?tab=dividend')}
            className="rounded-xl px-4 py-2 text-sm font-semibold"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
          >
            {pick('calcDetail', language)}
          </button>
        </div>
      ) : (
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {pick('noDividend', language)}
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="text-[11px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
            {pick('dividendHistory', language)}
          </div>
          <div className="space-y-1">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex justify-between text-xs"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span>{h.date}</span>
                <span className="font-semibold">{fmtEUR(h.amount, 2)}</span>
                <span style={{ color: 'var(--text-muted)' }}>{fmtEUR(h.amount * 0.05, 2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

