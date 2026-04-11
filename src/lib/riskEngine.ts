import { CALENDAR_EVENTS_2026 } from '../constants/calendar-events'
import { getRateValue } from './taxRates'
import { getUpcomingEvents, getOverdueEvents } from './calendarUtils'
import type { LegalForm } from '../store/userStore'
import type { Transaction } from '../store/accountingStore'
import type { Employee } from '../store/employeesStore'

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface Risk {
  id: string
  level: RiskLevel
  title: string
  description: string
  legalBasis?: string
  penaltyAmount?: string
  daysUntil?: number        // positive = upcoming, negative = overdue
  suggestedAction: string
  category: 'deadline' | 'tax' | 'social' | 'accounting' | 'vat' | 'compliance'
  detectedAt: string
}

export interface AuditReport {
  generatedAt: string
  legalForm: LegalForm
  companyName: string
  risks: Risk[]
  criticalCount: number
  highCount: number
  totalCount: number
  healthScore: number        // 0-100, 100 = no risks
}

function riskScore(level: RiskLevel): number {
  return { critical: 40, high: 20, medium: 10, low: 3, info: 0 }[level]
}

export function buildAuditReport(options: {
  legalForm: LegalForm
  companyName: string
  taxPeriod: string
  hasVat: boolean
  hasEmployees: boolean
  transactions: Transaction[]
  employees: Employee[]
  eik: string
  pendingCorrectionsCount?: number
}): AuditReport {
  const {
    legalForm, companyName, hasVat,
    hasEmployees, transactions, employees, eik,
    pendingCorrectionsCount = 0,
  } = options

  // Don't generate risks for unconfigured companies
  if (!options.companyName.trim() || !options.eik.trim()) {
    return {
      generatedAt: new Date().toISOString(),
      legalForm: options.legalForm,
      companyName: options.companyName,
      risks: [],
      criticalCount: 0,
      highCount: 0,
      totalCount: 0,
      healthScore: 100,
    }
  }

  const risks: Risk[] = []
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  // -- 1. DEADLINE RISKS --
  const upcoming = getUpcomingEvents(CALENDAR_EVENTS_2026, legalForm, 30)
  const overdue = getOverdueEvents(CALENDAR_EVENTS_2026, legalForm)

  // Don't generate deadline risks if no transactions yet
  const hasAnyData = options.transactions.length > 0

  if (hasAnyData) {
  for (const { event, daysUntil } of upcoming) {
    const level: RiskLevel =
      daysUntil <= 1  ? 'critical' :
      daysUntil <= 3  ? 'critical' :
      daysUntil <= 7  ? 'high' :
      daysUntil <= 14 ? 'medium' : 'low'

    risks.push({
      id: `deadline-upcoming-${event.id}`,
      level,
      title: `Срок: ${event.title_ru}`,
      description: daysUntil === 0
        ? `Сегодня последний день подачи. ${event.description_ru}`
        : `Через ${daysUntil} дн. - ${event.description_ru}`,
      legalBasis: event.legalBasis,
      penaltyAmount: event.penaltyAmount,
      daysUntil,
      suggestedAction: `Подайте ${event.title_ru} до ${event.dayOfMonth ?? event.day}-го числа через ${
        event.links[0]?.label ?? 'e-services.nap.bg'
      }`,
      category: 'deadline',
      detectedAt: now.toISOString(),
    })
  }

  for (const { event, daysOverdue } of overdue) {
    risks.push({
      id: `deadline-overdue-${event.id}`,
      level: 'critical',
      title: `⚠ ПРОСРОЧЕНО: ${event.title_ru}`,
      description: `Просрочено на ${daysOverdue} дн. ${event.penaltyInfo_ru}`,
      legalBasis: event.legalBasis,
      penaltyAmount: event.penaltyAmount,
      daysUntil: -daysOverdue,
      suggestedAction: 'Немедленно подайте ' + event.title_ru + '. Чем дольше просрочка - тем выше штраф. При первом нарушении можно попросить снижение санкции.',
      category: 'deadline',
      detectedAt: now.toISOString(),
    })
  }
  } // end if (hasAnyData)

  // -- 2. VAT RISKS --
  if (hasVat) {
    // Check if there are vat_out transactions without matching declarations
    const vatOut = transactions.filter((t) => t.type === 'vat_out')
    const vatIn = transactions.filter((t) => t.type === 'vat_in')

    if (vatOut.length > 0 && vatIn.length === 0) {
      risks.push({
        id: 'vat-no-deductible',
        level: 'medium',
        title: 'Нет покупок с ДДС кредитом',
        description: 'Есть продажи с ДДС, но нет покупок с данъчен кредит. Возможно, вы платите больше ДДС чем нужно.',
        legalBasis: 'ЗДДС чл. 68',
        suggestedAction: 'Проверьте все деловые расходы - счета с ДДС от болгарских поставщиков дают право на данъчен кредит и снижают ДДС к уплате.',
        category: 'vat',
        detectedAt: now.toISOString(),
      })
    }

  }

  // Companies NOT yet VAT registered approaching threshold
  if (!hasVat) {
    const VAT_THRESHOLD = getRateValue('vatThreshold', today)  // ЗДДС чл. 96 ал. 1, EUR
    const WARNING_LEVEL = VAT_THRESHOLD * 0.8
    const totalIncome = transactions
      .filter((t) => ['income', 'vat_out', 'appstore', 'googleplay', 'stripe'].includes(t.type))
      .reduce((s, t) => s + t.amount, 0)

    if (totalIncome >= WARNING_LEVEL && totalIncome < VAT_THRESHOLD) {
      risks.push({
        id: 'vat-threshold-approaching',
        level: 'high',
        title: 'Приближение к порогу ДДС регистрации',
        description: `Доход ${totalIncome.toFixed(0)} € приближается к порогу 51 130 €. При превышении необходимо зарегистрироваться по ДДС до его достижения.`,
        legalBasis: 'ЗДДС чл. 96 ал. 1',
        penaltyAmount: '500-5 000 €',
        suggestedAction: 'Следите за оборотом. При достижении 51 130 € подайте заявление о ДДС регистрации в НАП в течение 7 дней. Несвоевременная регистрация — штраф плюс retroactive ДДС.',
        category: 'vat',
        detectedAt: now.toISOString(),
      })
    }

    if (totalIncome >= VAT_THRESHOLD) {
      risks.push({
        id: 'vat-threshold-exceeded',
        level: 'critical',
        title: 'Превышен порог ДДС — требуется немедленная регистрация',
        description: `Доход ${totalIncome.toFixed(0)} € превысил 51 130 €. Вы обязаны зарегистрироваться по ДДС. Штраф за непроизведена регистрация: до 5 000 €.`,
        legalBasis: 'ЗДДС чл. 96 ал. 1, чл. 180',
        penaltyAmount: 'до 5 000 €',
        suggestedAction: 'Немедленно подайте заявление о ДДС регистрации в НАП. Каждый день просрочки увеличивает риск санкций.',
        category: 'vat',
        detectedAt: now.toISOString(),
      })
    }
  }

  // -- 3. EMPLOYEES RISKS --
  if (hasEmployees) {
    const activeEmployees = employees.filter((e) => e.active)

    if (activeEmployees.length === 0) {
      risks.push({
        id: 'employees-no-active',
        level: 'medium',
        title: 'Нет активных сотрудников при включенном флаге',
        description: 'В настройках указано "Има служители", но нет активных сотрудников в системе.',
        suggestedAction: 'Добавьте сотрудников в разделе "Служители" или отключите флаг в Настройках если сотрудников нет.',
        category: 'compliance',
        detectedAt: now.toISOString(),
      })
    }

    const minWage = getRateValue('minWage', today)
    const belowMin = activeEmployees.filter((e) => e.grossSalary < minWage)

    if (belowMin.length > 0) {
      risks.push({
        id: 'employees-below-min-wage',
        level: 'critical',
        title: `Зарплата ниже МРЗ у ${belowMin.length} сотрудников`,
        description: `Минимальная зарплата в 2026 - ${minWage} €. Сотрудники: ${belowMin.map((e) => e.name).join(', ')}.`,
        legalBasis: 'КТ чл. 244',
        penaltyAmount: '1 500-15 000 €',
        suggestedAction: 'Немедленно исправьте зарплату до минимум 620.20 €. Выплата ниже МРЗ - нарушение КТ с серьезными санкциями при проверке.',
        category: 'social',
        detectedAt: now.toISOString(),
      })
    }
  }

  // -- 4. ACCOUNTING RISKS --
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthTransactions = transactions.filter((t) => t.date.startsWith(currentMonth))

  if (monthTransactions.length === 0 && now.getDate() > 10) {
    risks.push({
      id: 'accounting-no-current-month',
      level: 'medium',
      title: 'Нет транзакций за текущий месяц',
      description: 'Середина месяца, но транзакций не внесено. Данные для декларации могут быть неполными.',
      suggestedAction: 'Внесите все доходы и расходы за текущий месяц в раздел Бухгалтерия. Актуальные данные нужны для корректного заполнения деклараций.',
      category: 'accounting',
      detectedAt: now.toISOString(),
    })
  }

  // -- 5. EIK RISK --
  if (!eik || eik.length < 9) {
    risks.push({
      id: 'profile-no-eik',
      level: 'high',
      title: 'Не указан ЕИК / Булстат',
      description: 'ЕИК обязателен для автозаполнения деклараций НАП. Без него невозможна корректная подача отчетности.',
      suggestedAction: 'Добавьте ЕИК в Настройки. Найти ЕИК: portal.registryagency.bg',
      category: 'compliance',
      detectedAt: now.toISOString(),
    })
  }

  // -- 6. DIVIDEND RISK --
  if (legalForm === 'ood') {
    const dividendTransactions = transactions.filter((t) => t.type === 'dividend')
    const totalIncome = transactions
      .filter((t) => ['income', 'vat_out', 'appstore', 'googleplay', 'stripe'].includes(t.type))
      .reduce((s, t) => s + t.amount, 0)
    const totalExpense = transactions
      .filter((t) => ['expense', 'vat_in', 'salary', 'depreciation'].includes(t.type))
      .reduce((s, t) => s + t.amount, 0)

    if (dividendTransactions.length > 0 && totalIncome <= totalExpense) {
      risks.push({
        id: 'dividend-no-profit',
        level: 'critical',
        title: 'Дивиденды выплачены при убытке',
        description: 'Обнаружены транзакции типа "Дивидент", но доходы не превышают расходы. Выплата дивидендов при убытке запрещена.',
        legalBasis: 'ЗКПО чл. 247',
        penaltyAmount: 'возврат + санкции',
        suggestedAction: 'Проверьте данные. Дивиденды можно выплачивать только из чистой прибыли после уплаты КНП. При наличии убытков - только после их покрытия.',
        category: 'tax',
        detectedAt: now.toISOString(),
      })
    }
  }

  // -- 7. PENDING CORRECTIONS FROM RATE CHANGES --
  // A retroactive tax rate change detected a numeric impact on
  // closed periods but the correction batch has not been
  // confirmed yet. Flag as high-risk until reviewed.
  if (pendingCorrectionsCount > 0) {
    risks.push({
      id: 'corrections-pending',
      level: 'high',
      title: 'Има непотвърдени корекции от промяна на ставки',
      description:
        `${pendingCorrectionsCount} непотвърдени корекции. ` +
        'Променена е данъчна ставка с обратна сила. Прегледайте и потвърдете корекцията.',
      suggestedAction: 'Отидете в Админ → Корекции и прегледайте.',
      category: 'compliance',
      detectedAt: now.toISOString(),
    })
  }

  // Calculate health score
  const totalPenalty = risks.reduce((s, r) => s + riskScore(r.level), 0)
  const healthScore = Math.max(0, 100 - totalPenalty)

  return {
    generatedAt: now.toISOString(),
    legalForm,
    companyName,
    risks: risks.sort((a, b) => riskScore(b.level) - riskScore(a.level)),
    criticalCount: risks.filter((r) => r.level === 'critical').length,
    highCount: risks.filter((r) => r.level === 'high').length,
    totalCount: risks.length,
    healthScore,
  }
}
