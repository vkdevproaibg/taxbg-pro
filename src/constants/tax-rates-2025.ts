export interface TaxRate {
  value: number
  effectiveFrom: string
  effectiveTo: string | null
  source: string
  notes_ru: string
}

export const CURRENCY = '€'
export const CURRENCY_SYMBOL = '€'
export const CURRENCY_CODE = 'EUR'

export const TAX_RATES_2025 = {
  // Corporate
  corporateTax: { value: 0.10, effectiveFrom: '2025-01-01', effectiveTo: null, source: 'ЗКПО чл. 20', notes_ru: 'Корпоративен данък — 10% от данъчната печалба' },
  personalIncomeTax: { value: 0.10, effectiveFrom: '2025-01-01', effectiveTo: null, source: 'ЗДДФЛ чл. 48', notes_ru: 'ДДФЛ — 10% плоска ставка' },
  dividendTax: { value: 0.07, effectiveFrom: '2025-01-01', effectiveTo: null, source: 'ЗДДФЛ чл. 38', notes_ru: 'Данък дивиденти — 7% (снижен с 10% с 2025)' },
  vat: { value: 0.20, effectiveFrom: '2025-01-01', effectiveTo: null, source: 'ЗДДС чл. 66', notes_ru: 'Стандартна ставка ДДС — 20%' },
  vatHospitality: { value: 0.09, effectiveFrom: '2025-01-01', effectiveTo: null, source: 'ЗДДС чл. 66 ал.2', notes_ru: 'Намалена ставка за хотели' },
  vatThreshold: { value: 51130, effectiveFrom: '2026-01-01', effectiveTo: null, source: 'ЗДДС чл. 96', notes_ru: 'Праг ДДС регистрация (100 000 BGN ÷ 1.95583, €)' },

  // Social insurance thresholds
  minOsig: { value: 551, effectiveFrom: '2026-01-01', effectiveTo: null, source: 'ЗБДОО 2026', notes_ru: 'Минимален осигурителен доход (€, от 01.01.2026)' },
  maxOsig: { value: 2112, effectiveFrom: '2026-01-01', effectiveTo: null, source: 'ЗБДОО 2026', notes_ru: 'Максимален осигурителен доход (€)' },
  minWage: { value: 551, effectiveFrom: '2026-01-01', effectiveTo: null, source: 'ПМС 2026', notes_ru: 'Минимална работна заплата (€)' },

  // Employer contributions (% of gross, capped at maxOsig)
  employer: {
    doo:   { value: 0.0982, source: 'КСО', notes_ru: 'ДОО Пенсии — работодател' },
    upf:   { value: 0.0282, source: 'КСО', notes_ru: 'ДЗПО УПФ — работодател' },
    zo:    { value: 0.0480, source: 'ЗЗО', notes_ru: 'Здравно осигуряване — работодател' },
    ozm:   { value: 0.0210, source: 'КСО', notes_ru: 'ОЗМ (болничные) — работодател' },
    tzpb:  { value: 0.0060, source: 'КСО', notes_ru: 'ТЗПБ (средно) — работодател' },
    bezr:  { value: 0.0040, source: 'КСО', notes_ru: 'Безработица — работодател' },
  },

  // Employee contributions
  employee: {
    doo:   { value: 0.0712, source: 'КСО', notes_ru: 'ДОО Пенсии — работник' },
    upf:   { value: 0.0218, source: 'КСО', notes_ru: 'ДЗПО УПФ — работник' },
    zo:    { value: 0.0320, source: 'ЗЗО', notes_ru: 'Здравно осигуряване — работник' },
    ozm:   { value: 0.0140, source: 'КСО', notes_ru: 'ОЗМ — работник' },
    bezr:  { value: 0.0060, source: 'КСО', notes_ru: 'Безработица — работник' },
  },

  // Self-employed contributions (самоосигуряващ)
  selfEmployed: {
    doo:   { value: 0.1480, source: 'КСО', notes_ru: 'ДОО Пенсии (с УПФ)' },
    dooNoUpf: { value: 0.1980, source: 'КСО', notes_ru: 'ДОО Пенсии (без УПФ, рождён до 1960)' },
    upf:   { value: 0.0500, source: 'КСО', notes_ru: 'ДЗПО УПФ' },
    zo:    { value: 0.0800, source: 'ЗЗО', notes_ru: 'Здравно осигуряване' },
    ozm:   { value: 0.0350, source: 'КСО', notes_ru: 'ОЗМ (по избор)' },
  },

  // Normative expense deductions
  normativeExpenses: {
    et:   { value: 0.15, source: 'ЗДДФЛ чл. 26', notes_ru: 'Нормативни разходи ЕТ — 15%' },
    self: { value: 0.25, source: 'ЗДДФЛ чл. 29', notes_ru: 'Нормативни разходи самоосигуряващ — 25%' },
  }
} as const
