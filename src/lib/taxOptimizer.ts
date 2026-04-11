import type { Company } from '../store/companiesStore'
import type { CompanyRelation } from '../store/groupStore'
import { llmChat } from './llm'

export type OptimizationRisk = 'low' | 'medium' | 'high'
export type OptimizationZone = 'green' | 'yellow' | 'red'

export interface TaxOptimization {
  id: string
  title: string
  description: string
  estimatedSaving?: number   // € per year
  zone: OptimizationZone
  risk: OptimizationRisk
  riskDetails: string
  legalBasis: string
  requiredActions: string[]
  warnings: string[]
  applicableTo: string[]     // companyIds
}

export interface GroupTaxAnalysis {
  companies: Company[]
  relations: CompanyRelation[]
  totalTaxBurden: number
  optimizedBurden: number
  potentialSaving: number
  optimizations: TaxOptimization[]
  redFlags: string[]
  generatedAt: string
}

// Effective tax rates by country
export const COUNTRY_TAX_RATES: Record<string, {
  corporateTax: number
  dividendTax: number
  withholdingTax: number
  vatRate: number
  hasIPBox: boolean
  euMember: boolean
  hasDoubleTexTreatyWithBG: boolean
  notes: string
}> = {
  BG: {
    corporateTax: 0.10, dividendTax: 0.05, withholdingTax: 0.05,
    vatRate: 0.20, hasIPBox: false, euMember: true,
    hasDoubleTexTreatyWithBG: true,
    notes: 'Болгария — одна из низших ставок в ЕС',
  },
  CY: {
    corporateTax: 0.125, dividendTax: 0, withholdingTax: 0,
    vatRate: 0.19, hasIPBox: true, euMember: true,
    hasDoubleTexTreatyWithBG: true,
    notes: 'IP Box 2.5%, нет налога на дивиденды между ЕС компаниями',
  },
  EE: {
    corporateTax: 0, dividendTax: 0.20, withholdingTax: 0,
    vatRate: 0.22, hasIPBox: false, euMember: true,
    hasDoubleTexTreatyWithBG: true,
    notes: '0% КНП при реинвестировании, 20% при распределении',
  },
  AE: {
    corporateTax: 0.09, dividendTax: 0, withholdingTax: 0,
    vatRate: 0.05, hasIPBox: false, euMember: false,
    hasDoubleTexTreatyWithBG: false,
    notes: 'КНП 9% от 375K AED (~102K €), нет налога на дивиденды',
  },
  GE: {
    corporateTax: 0.15, dividendTax: 0.05, withholdingTax: 0.05,
    vatRate: 0.18, hasIPBox: false, euMember: false,
    hasDoubleTexTreatyWithBG: true,
    notes: 'Виртуальная зона для IT — 0% КНП на экспортный доход',
  },
  MT: {
    corporateTax: 0.35, dividendTax: 0, withholdingTax: 0,
    vatRate: 0.18, hasIPBox: false, euMember: true,
    hasDoubleTexTreatyWithBG: true,
    notes: 'Эффективная ставка 5% через refund систему',
  },
  IE: {
    corporateTax: 0.125, dividendTax: 0, withholdingTax: 0.20,
    vatRate: 0.23, hasIPBox: true, euMember: true,
    hasDoubleTexTreatyWithBG: true,
    notes: 'Knowledge Development Box (IP) — 6.25%',
  },
  DE: {
    corporateTax: 0.30, dividendTax: 0.25, withholdingTax: 0.25,
    vatRate: 0.19, hasIPBox: false, euMember: true,
    hasDoubleTexTreatyWithBG: true,
    notes: 'Высокая ставка, но стабильность и репутация',
  },
  OTHER: {
    corporateTax: 0.20, dividendTax: 0.10, withholdingTax: 0.10,
    vatRate: 0.20, hasIPBox: false, euMember: false,
    hasDoubleTexTreatyWithBG: false,
    notes: 'Средние значения для неизвестной юрисдикции',
  },
}

// Rule-based optimizations — instant, no AI call needed
export function analyzeGroupRules(
  companies: Company[],
  relations: CompanyRelation[],
  totalAnnualRevenue: number
): TaxOptimization[] {
  const optimizations: TaxOptimization[] = []

  const bgCompanies       = companies.filter((c) => c.country === 'BG')
  const euCompanies       = companies.filter((c) => COUNTRY_TAX_RATES[c.country]?.euMember)
  const cyprusCompanies   = companies.filter((c) => c.country === 'CY')
  const estoniaCompanies  = companies.filter((c) => c.country === 'EE')
  const georgiaCompanies  = companies.filter((c) => c.country === 'GE')
  const uaeCompanies      = companies.filter((c) => c.country === 'AE')

  // ── 1. Дивидендный поток внутри ЕС ───────────────────────────
  if (euCompanies.length >= 2) {
    const parentSubRelations = relations.filter(r =>
      r.type === 'parent' || r.type === 'subsidiary'
    )
    if (parentSubRelations.length > 0) {
      optimizations.push({
        id: 'eu-parent-subsidiary',
        title: 'Директива ЕС о материнских и дочерних компаниях',
        description: 'При владении 10%+ дочерней компанией в ЕС — дивиденды освобождены от удерживаемого налога у источника (WHT 0%). Директива 2011/96/EU.',
        estimatedSaving: totalAnnualRevenue * 0.05,
        zone: 'green',
        risk: 'low',
        riskDetails: 'Хорошо задокументированная норма ЕС. Риск минимален при правильном оформлении.',
        legalBasis: 'Директива 2011/96/EU · ЗКПО чл. 194',
        requiredActions: [
          'Убедитесь что владеете 10%+ в течение минимум 1 года',
          'Получите сертификат налогового резидентства',
          'Оформите выплату дивидендов официальным решением',
        ],
        warnings: [],
        applicableTo: euCompanies.map((c) => c.id),
      })
    }
  }

  // ── 2. IP Box на Кипре ────────────────────────────────────────
  if (cyprusCompanies.length > 0 && bgCompanies.length > 0) {
    optimizations.push({
      id: 'cy-ip-box',
      title: 'Кипрский IP Box — налог 2.5% на доходы от IP',
      description: 'Доходы от интеллектуальной собственности (ПО, патенты, торговые марки) в Кипрской компании облагаются по ставке 2.5% вместо 12.5%. Болгарская компания платит роялти кипрской.',
      estimatedSaving: totalAnnualRevenue * 0.075,
      zone: 'yellow',
      risk: 'medium',
      riskDetails: 'Требует реального экономического присутствия (substance) на Кипре. ОЭСР BEPS Action 5 устанавливает требования к nexus approach. ФНС России и НАП Болгарии могут проверить обоснованность роялти.',
      legalBasis: 'Кипрский закон об ИП · OECD BEPS Action 5 · ЗКПО чл. 199',
      requiredActions: [
        'Зарегистрировать IP (ПО, торговую марку) на кипрскую компанию',
        'Обеспечить реальное присутствие: местный директор, офис, персонал',
        'Заключить лицензионный договор между BG и CY компаниями',
        "Установить рыночную ставку роялти (arm's length principle)",
        'Ежегодно обновлять трансфертное ценообразование',
      ],
      warnings: [
        '⚠ Без substance на Кипре — высокий риск переквалификации НАП',
        "⚠ Роялти должны соответствовать рыночным ценам (arm's length)",
        '⚠ Болгарский WHT 10% на роялти в третьи страны (не ЕС)',
        '⚠ Потребуется аудит трансфертного ценообразования',
      ],
      applicableTo: [...cyprusCompanies.map(c => c.id), ...bgCompanies.map(c => c.id)],
    })
  }

  // ── 3. Эстония для реинвестирования ─────────────────────────
  if (estoniaCompanies.length > 0) {
    optimizations.push({
      id: 'ee-reinvestment',
      title: 'Эстония — 0% КНП при реинвестировании прибыли',
      description: 'Прибыль эстонской компании облагается налогом только при распределении. При реинвестировании в рост бизнеса — КНП 0%. Идеально для накопления капитала.',
      estimatedSaving: totalAnnualRevenue * 0.10,
      zone: 'green',
      risk: 'low',
      riskDetails: 'Полностью легальная схема. Эстония — член ЕС с прозрачной системой. Риск только при необоснованном накоплении без реальной деятельности.',
      legalBasis: 'Эстонский Закон о налоге на прибыль · Директива ЕС',
      requiredActions: [
        'Открыть эстонскую компанию (через e-Residency или местный директор)',
        'Реальная деятельность или обоснованное холдинговое назначение',
        'Прибыль оставлять в компании, не распределять',
      ],
      warnings: [
        '⚠ При распределении дивидендов — налог 20%',
        '⚠ Нужна реальная деятельность для избежания CFC rules',
      ],
      applicableTo: estoniaCompanies.map((c) => c.id),
    })
  }

  // ── 4. Грузия Virtual Zone для IT ────────────────────────────
  if (georgiaCompanies.length > 0) {
    optimizations.push({
      id: 'ge-virtual-zone',
      title: 'Грузия IT Virtual Zone — 0% КНП на экспорт',
      description: 'Грузинские IT компании со статусом Virtual Zone Company платят 0% КНП на доходы от экспорта IT услуг. Подоходный налог для сотрудников — 20%.',
      estimatedSaving: totalAnnualRevenue * 0.15,
      zone: 'green',
      risk: 'low',
      riskDetails: 'Официальный статус выдаётся правительством Грузии. Хорошо известная схема. Риск — только если доход классифицируется не как экспорт.',
      legalBasis: 'Georgian Tax Code Art. 99 · Virtual Zone Status',
      requiredActions: [
        'Получить статус Virtual Zone Company в Грузии',
        'Все доходы должны быть от экспорта (не грузинские клиенты)',
        'Зарегистрировать компанию в Тбилиси',
      ],
      warnings: [
        '⚠ Только для экспортных IT доходов — грузинские клиенты облагаются обычно',
        '⚠ Личный доход директора облагается 20% НДФЛ',
      ],
      applicableTo: georgiaCompanies.map((c) => c.id),
    })
  }

  // ── 5. Оптимизация внутри Болгарии ───────────────────────────
  if (bgCompanies.length > 0) {
    const hasSelfEmployed = companies.some(c => c.legalForm === 'self')
    if (!hasSelfEmployed) {
      optimizations.push({
        id: 'bg-self-employed',
        title: 'Самоосигуряващ + ООД — оптимальное сочетание',
        description: 'Комбинация ООД (КНП 10%) и личного статуса самоосигуряващ позволяет выводить часть дохода через нормативные расходы 25% с меньшей налоговой нагрузкой.',
        estimatedSaving: totalAnnualRevenue * 0.03,
        zone: 'green',
        risk: 'low',
        riskDetails: 'Полностью легально. Обычная практика для небольших IT компаний в Болгарии.',
        legalBasis: 'ЗДДФЛ чл. 29 · КСО',
        requiredActions: [
          'Зарегистрироваться как самоосигуряващ се (бесплатно в НАП)',
          'Выставлять фактуры от физлица за консалтинг',
          'Не превышать порог ДДС 51 130 €/год',
        ],
        warnings: [],
        applicableTo: bgCompanies.map((c) => c.id),
      })
    }
  }

  // ── 6. UAE — безналоговая юрисдикция ─────────────────────────
  if (uaeCompanies.length > 0) {
    optimizations.push({
      id: 'ae-freezone',
      title: 'ОАЭ Free Zone — эффективная ставка 0-9%',
      description: 'Компании в свободных зонах ОАЭ (DIFC, ADGM, Dubai South) освобождены от КНП при работе исключительно внутри зоны. КНП 9% применяется к доходам за пределами зоны.',
      estimatedSaving: totalAnnualRevenue * 0.09,
      zone: 'yellow',
      risk: 'medium',
      riskDetails: 'ОАЭ не член ЕС, нет договора с Болгарией. НАП может применить CFC rules если ОАЭ компания контролируется болгарским резидентом. После 2023 года ОАЭ ввели КНП 9%.',
      legalBasis: 'UAE Corporate Tax Law 2022 · ЗКПО чл. 42 (CFC)',
      requiredActions: [
        'Зарегистрировать компанию в Free Zone (DIFC, RAKEZ, Meydan)',
        'Обеспечить реальное присутствие: местный директор или управляющий',
        'Открыть банковский счёт в ОАЭ',
        'Проконсультироваться с болгарским налоговым адвокатом о CFC rules',
      ],
      warnings: [
        '⚠ Болгария применяет CFC rules к контролируемым иностранным компаниям',
        '⚠ Нет договора об избежании двойного налогообложения с Болгарией',
        '⚠ Банки ЕС могут запрашивать объяснения по ОАЭ счетам',
        '⚠ После 2023: КНП 9% на доходы свыше ~102K € в год',
        '⚠ Требуется консультация специалиста перед внедрением',
      ],
      applicableTo: uaeCompanies.map((c) => c.id),
    })
  }

  return optimizations
}

// AI-enhanced analysis for complex group structures
export async function analyzeGroupAI(
  companies: Company[],
  relations: CompanyRelation[],
  totalRevenue: number,
  apiKey?: string
): Promise<{ recommendations: string; redFlags: string[] }> {

  const groupDescription = companies.map((c) => {
    const rate = COUNTRY_TAX_RATES[c.country] ?? COUNTRY_TAX_RATES.OTHER
    return [
      `Компания: ${c.name}`,
      `  Страна: ${c.country} | КНП: ${rate.corporateTax * 100}%`,
      `  Форма: ${c.legalForm} | ДДС: ${c.hasVat ? 'да' : 'нет'}`,
      `  Офшор/холдинг: ${c.isOffshore ? 'да' : 'нет'}`,
      c.notes ? `  Заметки: ${c.notes}` : '',
    ].filter(Boolean).join('\n')
  }).join('\n\n')

  const relationsDescription = relations.map((r) => {
    const from = companies.find(c => c.id === r.fromCompanyId)?.name ?? r.fromCompanyId
    const to   = companies.find(c => c.id === r.toCompanyId)?.name   ?? r.toCompanyId
    return `${from} → ${to}: ${r.type}${r.ownershipPct ? ` (${r.ownershipPct}%)` : ''}${r.annualFlow ? ` · ${r.annualFlow}€/год` : ''}${r.notes ? ` · ${r.notes}` : ''}`
  }).join('\n')

  const prompt = `Ты — опытный международный налоговый консультант.
Специализация: структурирование IT компаний, трансфертное ценообразование, международная налоговая оптимизация.
Аудитория: IT предприниматели из России и Украины с компаниями в Болгарии и других юрисдикциях.

ВАЖНО: Ты работаешь только в рамках закона.
- Зелёная зона: полностью легальные оптимизации, описывай детально
- Жёлтая зона: легально но требует осторожности — описывай С предупреждениями о рисках
- Красная зона: уклонение от налогов — НЕ рекомендуй, предупреди о последствиях

СТРУКТУРА ГРУППЫ:
${groupDescription}

СВЯЗИ МЕЖДУ КОМПАНИЯМИ:
${relationsDescription || 'Связей нет'}

ГОДОВОЙ ОБОРОТ ГРУППЫ: ~${totalRevenue.toLocaleString()} €

Проанализируй структуру и дай:
1. Топ-3 конкретные легальные рекомендации для этой группы (с расчётом экономии)
2. Красные флаги — риски которые нужно устранить немедленно
3. Один совет по долгосрочному структурированию

Отвечай на русском языке. Будь конкретным, ссылайся на законы.`

  try {
    const response = await llmChat(
      [{ role: 'user', content: prompt }],
      { maxTokens: 1500, temperature: 0.3, apiKey }
    )

    // Extract red flags from response
    const redFlags: string[] = []
    const lines = response.content.split('\n')
    let inRedFlags = false
    for (const line of lines) {
      if (line.toLowerCase().includes('красн') || line.toLowerCase().includes('риск')) {
        inRedFlags = true
      }
      if (inRedFlags && line.trim().startsWith('-')) {
        redFlags.push(line.trim().slice(1).trim())
      }
    }

    return { recommendations: response.content, redFlags }
  } catch {
    return {
      recommendations: 'Не удалось получить AI анализ. Проверьте API ключ.',
      redFlags: [],
    }
  }
}
