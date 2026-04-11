import type { AuditIssue } from '../../store/entryAuditStore'

export interface DiagnosticAnswers {
  foundedYear?: string
  gfoAllYears?: string
  gfoLastYear?: string
  napAllDeclarations?: string
  isVatRegistered?: string
  ddsAllMonths?: string
  ddsLastPeriod?: string
  ddsPendingAmount?: string
  hasEmployees?: string
  obrazec1AllMonths?: string
  obrazec1LastPeriod?: string
  osigDebt?: string
  osigDebtAmount?: string
  zkpoAllYears?: string
  zkpoLastYear?: string
  knpDebt?: string
  nsiAllYears?: string
  hasAssets?: string
  amortizationDone?: string
  dividendsPaid?: string
  dividendsProtocol?: string
}

function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

function daysBetween(dateStr: string): number {
  const date = new Date(dateStr + '-01')
  const now  = new Date()
  return Math.floor((now.getTime() - date.getTime()) / 86400000)
}

export function analyzeAnswers(answers: DiagnosticAnswers): AuditIssue[] {
  const issues: AuditIssue[] = []
  const now      = new Date()
  const nowStr   = now.toISOString().slice(0, 7)
  const thisYear = now.getFullYear()

  // ── 1. DDS декларации ──────────────────────────────────────
  if (answers.isVatRegistered === 'yes') {
    if (answers.ddsAllMonths === 'no' || answers.ddsAllMonths === 'unknown') {
      const lastPeriod   = answers.ddsLastPeriod ?? `${thisYear}-01`
      const monthsMissed = Math.max(monthsBetween(lastPeriod, nowStr), 0)
      const days         = daysBetween(lastPeriod)

      if (monthsMissed > 0) {
        issues.push({
          id: 'dds-missing',
          level: 'critical',
          title: `ДДС декларации — пропущено ${monthsMissed} мес.`,
          description: `Последний закрытый период: ${lastPeriod}. ` +
            `Не подано деклараций: ${monthsMissed}. Просрочка: ${days} дней.`,
          penaltyMin: monthsMissed * 500,
          penaltyMax: monthsMissed * 10000,
          legalBasis: 'ЗДДС чл. 125 · ЗАНН чл. 53',
          daysOverdue: days,
          actions: [
            {
              order: 1,
              title: 'Подать все пропущенные ДДС декларации',
              description: `Подать декларации за каждый пропущенный месяц ` +
                `через portal.nra.bg с КЕП. Начните с самой ранней.`,
              link: 'https://portal.nra.bg',
              deadline: 'Немедленно',
            },
            {
              order: 2,
              title: 'Уплатить ДДС с пенями',
              description: 'Рассчитать пени за просрочку (законна лихва) и уплатить через epay.bg',
              link: 'https://epay.bg',
            },
          ],
        })
      }
    }

    const pendingDDS = Number(answers.ddsPendingAmount ?? 0)
    if (pendingDDS > 0) {
      issues.push({
        id: 'dds-pending',
        level: 'critical',
        title: 'Неуплаченный ДДС',
        description: `Задолженность по ДДС: ${pendingDDS.toFixed(2)} €. ` +
          'НАП начисляет пени и может заблокировать банковский счёт.',
        penaltyMin: pendingDDS,
        penaltyMax: pendingDDS * 1.5,
        legalBasis: 'ЗДДС чл. 89 · ДОПК чл. 163',
        actions: [
          {
            order: 1,
            title: 'Уплатить задолженность по ДДС немедленно',
            description: `Сумма: ${pendingDDS} €. Оплата через epay.bg или в офисе НАП. Код плательщика: ваш ЕИК.`,
            link: 'https://epay.bg',
            deadline: 'Сегодня',
          },
        ],
      })
    }
  }

  // ── 2. Образец 1 ───────────────────────────────────────────
  if (answers.hasEmployees === 'yes') {
    if (answers.obrazec1AllMonths === 'no' || answers.obrazec1AllMonths === 'unknown') {
      const lastPeriod   = answers.obrazec1LastPeriod ?? `${thisYear}-01`
      const monthsMissed = Math.max(monthsBetween(lastPeriod, nowStr), 0)

      if (monthsMissed > 0) {
        issues.push({
          id: 'obrazec1-missing',
          level: 'critical',
          title: `Образец 1 — пропущено ${monthsMissed} мес.`,
          description: `Не подан Образец 1 за ${monthsMissed} месяцев. ` +
            'Это нарушение прав сотрудников на пенсионные права.',
          penaltyMin: monthsMissed * 500,
          penaltyMax: monthsMissed * 3000,
          legalBasis: 'Наредба Н-13 · КСО чл. 7',
          actions: [
            {
              order: 1,
              title: 'Подать Образец 1 за каждый пропущенный месяц',
              description: 'Через inetdec.nra.bg. Для каждого сотрудника отдельно за каждый месяц.',
              link: 'https://inetdec.nra.bg',
              deadline: 'В течение недели',
              downloadType: 'obrazec1_csv',
            },
          ],
        })
      }
    }

    if (answers.osigDebt === 'yes') {
      const amount = Number(answers.osigDebtAmount ?? 0)
      issues.push({
        id: 'osig-debt',
        level: 'critical',
        title: 'Задолженность по осигуровкам',
        description: `Неуплаченные осигуровки${amount > 0 ? `: ${amount} €` : ''}. ` +
          'НАП начисляет пени автоматически.',
        penaltyMin: amount > 0 ? amount : undefined,
        legalBasis: 'КСО чл. 107 · ЗЗО чл. 40',
        actions: [
          {
            order: 1,
            title: 'Уплатить задолженность по осигуровкам',
            description: 'Через epay.bg или в банке. Платёжное поручение: код 7 (ДОО), код 8 (ЗО), код 9 (УПФ).',
            link: 'https://epay.bg',
            deadline: 'Немедленно',
          },
        ],
      })
    }
  }

  // ── 3. ЗКПО ────────────────────────────────────────────────
  if (answers.zkpoAllYears === 'no' || answers.zkpoAllYears === 'unknown') {
    const lastYear    = Number(answers.zkpoLastYear ?? thisYear - 2)
    const yearsMissed = thisYear - 1 - lastYear

    if (yearsMissed > 0) {
      issues.push({
        id: 'zkpo-missing',
        level: 'critical',
        title: `ЗКПО — не подана за ${yearsMissed} ${yearsMissed === 1 ? 'год' : 'года'}`,
        description: `Не подана годовая декларация по ЗКПО за ` +
          `${yearsMissed === 1 ? `${lastYear + 1} год` : `${lastYear + 1}–${thisYear - 1} годы`}.`,
        penaltyMin: yearsMissed * 500,
        penaltyMax: yearsMissed * 3000,
        legalBasis: 'ЗКПО чл. 92 · ЗАНН чл. 53',
        actions: [
          {
            order: 1,
            title: 'Восстановить финансовые данные за пропущенные годы',
            description: 'Собрать банковские выписки и фактуры. Использовать раздел ОПР для расчёта.',
          },
          {
            order: 2,
            title: 'Подать ЗКПО за каждый пропущенный год',
            description: 'Через portal.nra.bg с КЕП. Задержанные декларации подаются с пенями.',
            link: 'https://portal.nra.bg',
            deadline: 'В течение месяца',
            downloadType: 'zkpo_xml',
          },
        ],
      })
    }
  }

  const knpDebt = Number(answers.knpDebt ?? 0)
  if (knpDebt > 0) {
    issues.push({
      id: 'knp-debt',
      level: 'critical',
      title: 'Неуплаченный корпоративный налог',
      description: `Задолженность по КНП: ${knpDebt} €. НАП начисляет пени за каждый день просрочки.`,
      penaltyMin: knpDebt,
      legalBasis: 'ЗКПО чл. 93 · ДОПК чл. 175',
      actions: [
        {
          order: 1,
          title: `Уплатить КНП: ${knpDebt} €`,
          description: 'Через epay.bg или в банке на сч. НАП.',
          link: 'https://epay.bg',
          deadline: 'Немедленно',
        },
      ],
    })
  }

  // ── 4. НСИ ─────────────────────────────────────────────────
  if (answers.nsiAllYears === 'no' || answers.nsiAllYears === 'unknown') {
    const foundedYear = Number(answers.foundedYear ?? thisYear - 1)
    const yearsMissed = Math.max(thisYear - 1 - foundedYear, 0)

    if (yearsMissed > 0 || answers.nsiAllYears === 'no') {
      issues.push({
        id: 'nsi-missing',
        level: 'important',
        title: 'Годовой отчёт НСИ — возможно не подан',
        description: 'Статистический отчёт в НСИ подаётся ежегодно до 30 июня. ' +
          'Самый часто забываемый отчёт. Штраф до 2 000 €.',
        penaltyMin: 500,
        penaltyMax: 2000,
        legalBasis: 'ЗСТАТИСТИКАТА чл. 20 · чл. 52',
        actions: [
          {
            order: 1,
            title: 'Проверить статус на nsi.bg',
            description: 'Войти с КЕП → проверить поданные отчёты → при необходимости подать за пропущенные годы.',
            link: 'https://nsi.bg',
          },
        ],
      })
    }
  }

  // ── 5. ГФО в БРРА ──────────────────────────────────────────
  if (answers.gfoAllYears === 'no' || answers.gfoAllYears === 'unknown') {
    issues.push({
      id: 'gfo-missing',
      level: 'important',
      title: 'ГФО в БРРА — возможно не опубликован',
      description: 'Все ООД обязаны ежегодно публиковать финансовый отчёт в БРРА. ' +
        'Непубликация — штраф до 2 000 €.',
      penaltyMin: 500,
      penaltyMax: 2000,
      legalBasis: 'ЗСч чл. 40 · Закон за търговския регистър',
      actions: [
        {
          order: 1,
          title: 'Проверить публикации на brra.bg',
          description: 'brra.bg → поиск по ЕИК → раздел "Годишни финансови отчети"',
          link: 'https://brra.bg',
        },
        {
          order: 2,
          title: 'Подать пропущенные ГФО',
          description: 'Через Портала за електронни услуги на БРРА с КЕП.',
          link: 'https://brra.bg',
        },
      ],
    })
  }

  // ── 6. Амортизация ─────────────────────────────────────────
  if (answers.hasAssets === 'yes' &&
    (answers.amortizationDone === 'no' || answers.amortizationDone === 'unknown')) {
    issues.push({
      id: 'amortization-missing',
      level: 'attention',
      title: 'Амортизация не начислялась',
      description: 'Если основные средства не амортизировались — вероятно переплачен корпоративный налог. ' +
        'Можно скорректировать в текущей декларации.',
      legalBasis: 'ЗКПО чл. 54–60',
      actions: [
        {
          order: 1,
          title: 'Ввести основные средства в систему',
          description: 'Бухгалтерия → Разходи → Покупка основного средства. ' +
            'Указать дату покупки и стоимость — система рассчитает амортизацию.',
        },
        {
          order: 2,
          title: 'Учесть амортизацию в ЗКПО',
          description: 'Накопленная амортизация уменьшает налогооблагаемую прибыль.',
        },
      ],
    })
  }

  // ── 7. Дивиденды без протокола ──────────────────────────────
  if (answers.dividendsPaid === 'yes' &&
    (answers.dividendsProtocol === 'no' || answers.dividendsProtocol === 'unknown')) {
    issues.push({
      id: 'dividends-no-protocol',
      level: 'attention',
      title: 'Дивиденды без решения собственника',
      description: 'Выплата дивидендов требует официального решения собственника ' +
        '(Протокол на едноличния собственик). ' +
        'Без протокола НАП может переквалифицировать как зарплату.',
      legalBasis: 'Търговски закон чл. 147 · ЗДДФЛ чл. 38',
      actions: [
        {
          order: 1,
          title: 'Оформить протокол задним числом',
          description: 'Юридически допустимо с некоторыми ограничениями. ' +
            'Проконсультируйтесь с адвокатом или нотариусом.',
        },
      ],
    })
  }

  // ── 8. Всё в порядке ────────────────────────────────────────
  if (issues.length === 0) {
    issues.push({
      id: 'all-ok',
      level: 'ok',
      title: 'Всё в порядке',
      description: 'По вашим данным незакрытых обязательств не обнаружено. ' +
        'Можно начинать работу в системе.',
      legalBasis: '',
      actions: [],
    })
  }

  return issues
}
