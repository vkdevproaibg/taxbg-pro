// Bulgarian legal/tax terms with plain-language
// explanations for non-Bulgarian users.
//
// Usage:
//   const { term, explain } = useBgTerm('nadvnesen_danyk')
//   // term    → "Надвнесен данък" (always Bulgarian)
//   // explain → "Переплата по налогу" (in user's language)
//   //           null for BG users
//
// For UI: <BgTermLabel termKey="nadvnesen_danyk" />

import { useUserStore } from '../store/userStore'

interface BgTerm {
  bg: string          // official Bulgarian term
  ru: string | null   // explanation in Russian
  uk: string | null   // explanation in Ukrainian
  en: string | null   // explanation in English
}

export const BG_TERMS: Record<string, BgTerm> = {

  // ── ДАНЪЦИ ───────────────────────────────────
  korporativen_danyk: {
    bg: 'Корпоративен данък',
    ru: 'Налог на прибыль компании (10%)',
    uk: 'Податок на прибуток компанії (10%)',
    en: 'Corporate income tax (10%)',
  },
  nadvnesen_danyk: {
    bg: 'Надвнесен данък',
    ru: 'Переплата по налогу (авансы превысили итог)',
    uk: 'Переплата з податку (аванси перевищили підсумок)',
    en: 'Tax overpayment (advance payments exceeded final tax)',
  },
  danyk_za_dovnasyane: {
    bg: 'Данък за довнасяне',
    ru: 'Налог к доплате',
    uk: 'Податок до доплати',
    en: 'Additional tax due',
  },
  danychna_pechalba: {
    bg: 'Данъчна печалба',
    ru: 'Налогооблагаемая прибыль',
    uk: 'Оподатковуваний прибуток',
    en: 'Taxable profit',
  },
  dividenti: {
    bg: 'Дивиденти',
    ru: 'Дивиденды (налог 5% — ЗДДФЛ чл. 38 ал. 2)',
    uk: 'Дивіденди (податок 5% — ЗДДФЛ чл. 38 ал. 2)',
    en: 'Dividends (5% tax — ЗДДФЛ art. 38 para. 2)',
  },

  // ── ДДС ──────────────────────────────────────
  dds: {
    bg: 'ДДС',
    ru: 'НДС — налог на добавленную стоимость',
    uk: 'ПДВ — податок на додану вартість',
    en: 'VAT — Value Added Tax',
  },
  dds_registraciya: {
    bg: 'Регистрация по ДДС',
    ru: 'Регистрация плательщиком НДС (порог — 51 130 €/год)',
    uk: 'Реєстрація платником ПДВ (поріг — 51 130 €/рік)',
    en: 'VAT registration (threshold — €51,130/year)',
  },
  nacislen_dds: {
    bg: 'Начислен ДДС',
    ru: 'НДС начисленный (с продаж — к уплате в НАП)',
    uk: 'ПДВ нарахований (з продажів — до сплати в НАП)',
    en: 'Output VAT (from sales — payable to tax authority)',
  },
  danachen_kredit: {
    bg: 'Данъчен кредит',
    ru: 'Налоговый вычет по НДС (с покупок)',
    uk: 'Податковий кредит з ПДВ (з покупок)',
    en: 'Input VAT credit (from purchases)',
  },

  // ── ОСИГУРОВКИ ────────────────────────────────
  osigurovki: {
    bg: 'Осигуровки',
    ru: 'Социальные и медицинские взносы',
    uk: 'Соціальні та медичні внески',
    en: 'Social and health insurance contributions',
  },
  osigurovki_rabotnik: {
    bg: 'Осигуровки работник',
    ru: 'Взносы работника (удерживаются из зарплаты)',
    uk: 'Внески працівника (утримуються із зарплати)',
    en: 'Employee contributions (withheld from salary)',
  },
  osigurovki_rabotodatel: {
    bg: 'Осигуровки работодател',
    ru: 'Взносы работодателя (сверх брутто)',
    uk: 'Внески роботодавця (понад брутто)',
    en: 'Employer contributions (on top of gross)',
  },
  doo: {
    bg: 'ДОО',
    ru: 'Пенсионные взносы (Държавно обществено осигуряване)',
    uk: 'Пенсійні внески (Държавно обществено осигуряване)',
    en: 'Pension contributions (State social insurance)',
  },
  dzpo_upf: {
    bg: 'ДЗПО / УПФ',
    ru: 'Накопительная пенсия (Допълнително задължително пенсионно осигуряване)',
    uk: 'Накопичувальна пенсія (Допълнително задължително пенсионно осигуряване)',
    en: 'Supplementary mandatory pension fund',
  },
  zo: {
    bg: 'Здравно осигуряване',
    ru: 'Медицинская страховка (обязательная)',
    uk: 'Медичне страхування (обов\'язкове)',
    en: 'Mandatory health insurance',
  },
  samoosiguryavast: {
    bg: 'Самоосигуряващ се',
    ru: 'Самозанятый / директор ООД — платит взносы сам за себя',
    uk: 'Самозайнятий / директор ООД — платить внески сам за себе',
    en: 'Self-insured person (sole trader or company director)',
  },
  min_osig_dohod: {
    bg: 'Минимален осигурителен доход',
    ru: 'Минимальная база для расчёта взносов (620.20 €/мес)',
    uk: 'Мінімальна база для розрахунку внесків (620.20 €/міс)',
    en: 'Minimum insurance income base (€620.20/month)',
  },
  max_osig_dohod: {
    bg: 'Максимален осигурителен доход',
    ru: 'Максимальная база для взносов (2 111.64 €/мес)',
    uk: 'Максимальна база для внесків (2 111.64 €/міс)',
    en: 'Maximum insurance income base (€2,111.64/month)',
  },

  // ── ДЕКЛАРАЦИИ ────────────────────────────────
  gdd: {
    bg: 'ГДД',
    ru: 'Годовая налоговая декларация (физлицо / самозанятый)',
    uk: 'Річна податкова декларація (фізособа / самозайнятий)',
    en: 'Annual personal income tax return',
  },
  gfo: {
    bg: 'ГФО',
    ru: 'Годовой финансовый отчёт (публикуется в БРРА)',
    uk: 'Річний фінансовий звіт (публікується в БРРА)',
    en: 'Annual financial report (filed with BRRA)',
  },
  spravka_deklaraciya: {
    bg: 'Справка-декларация по ДДС',
    ru: 'Декларация по НДС (подаётся ежемесячно до 14-го)',
    uk: 'Декларація з ПДВ (подається щомісяця до 14-го)',
    en: 'VAT return (filed monthly by the 14th)',
  },

  // ── ОТЧЁТЫ ───────────────────────────────────
  opr: {
    bg: 'ОПР',
    ru: 'Отчёт о прибылях и убытках (доходы минус расходы)',
    uk: 'Звіт про прибутки та збитки (доходи мінус витрати)',
    en: 'Profit and Loss statement (income minus expenses)',
  },
  balans: {
    bg: 'Баланс',
    ru: 'Бухгалтерский баланс (активы = пассивы)',
    uk: 'Бухгалтерський баланс (активи = пасиви)',
    en: 'Balance sheet (assets = liabilities)',
  },
  aktivy: {
    bg: 'Активи',
    ru: 'Активы (всё что принадлежит компании)',
    uk: 'Активи (все що належить компанії)',
    en: 'Assets (everything the company owns)',
  },
  pasivi: {
    bg: 'Пасиви',
    ru: 'Пассивы (капитал + обязательства)',
    uk: 'Пасиви (капітал + зобов\'язання)',
    en: 'Liabilities and equity',
  },
  chista_pechalba: {
    bg: 'Чиста печалба',
    ru: 'Чистая прибыль (после налога)',
    uk: 'Чистий прибуток (після податку)',
    en: 'Net profit (after tax)',
  },

  // ── ОРГАНИЗАЦИИ ──────────────────────────────
  nap: {
    bg: 'НАП',
    ru: 'Налоговая служба Болгарии (аналог ФНС/ДФС)',
    uk: 'Податкова служба Болгарії (аналог ДФС)',
    en: 'Bulgarian National Revenue Agency (tax authority)',
  },
  brra: {
    bg: 'БРРА',
    ru: 'Агентство по регистрации (торговый реестр)',
    uk: 'Агентство з реєстрації (торговий реєстр)',
    en: 'Bulgarian Registry Agency (commercial register)',
  },
  nsi: {
    bg: 'НСИ',
    ru: 'Национальный статистический институт',
    uk: 'Національний статистичний інститут',
    en: 'National Statistical Institute',
  },

  // ── ПРАВОВЫЕ ФОРМЫ ───────────────────────────
  ood: {
    bg: 'ООД',
    ru: 'Общество с ограниченной ответственностью (аналог ООО)',
    uk: 'Товариство з обмеженою відповідальністю (аналог ТОВ)',
    en: 'Limited Liability Company (LLC equivalent)',
  },
  eood: {
    bg: 'ЕООД',
    ru: 'Единоличное ООД — один владелец',
    uk: 'Одноосібне ТОВ — один власник',
    en: 'Single-member LLC',
  },
  et: {
    bg: 'ЕТ',
    ru: 'Индивидуальный предприниматель (ЕТ)',
    uk: 'Фізична особа-підприємець',
    en: 'Sole trader (individual entrepreneur)',
  },
}

export type BgTermKey = keyof typeof BG_TERMS

// ── HOOK ─────────────────────────────────────────

export function useBgTerm(termKey: string): {
  term: string
  explain: string | null
} {
  const language = useUserStore((s) => s.language)
  const entry = BG_TERMS[termKey]

  if (!entry) {
    return { term: termKey, explain: null }
  }

  if (language === 'bg') {
    return { term: entry.bg, explain: null }
  }

  return {
    term: entry.bg,
    explain: entry[language] ?? entry.ru ?? null,
  }
}

// ── COMPONENT ────────────────────────────────────

interface BgTermProps {
  termKey: string
  className?: string
  inline?: boolean
}

export function BgTermLabel({ termKey, className, inline }: BgTermProps) {
  const { term, explain } = useBgTerm(termKey)

  if (inline || !explain) {
    return (
      <span className={className} style={{ color: 'var(--text-primary)' }}>
        {term}
        {explain && (
          <span
            className="ml-1 text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            · {explain}
          </span>
        )}
      </span>
    )
  }

  return (
    <span className={className}>
      <span style={{ color: 'var(--text-primary)' }}>{term}</span>
      <span
        className="block text-xs mt-0.5"
        style={{ color: 'var(--text-muted)' }}
      >
        {explain}
      </span>
    </span>
  )
}
