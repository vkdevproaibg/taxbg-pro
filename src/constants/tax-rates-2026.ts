import type { TaxRate } from './tax-rates-2025'

export interface TaxRateYear extends TaxRate {}

export const TAX_RATES_2026 = {
  corporateTax:     { value: 0.10,   effectiveFrom: '2026-01-01', effectiveTo: null, source: 'ЗКПО чл. 20',    notes_ru: 'Корпоративен данък — 10%' },
  personalIncomeTax:{ value: 0.10,   effectiveFrom: '2026-01-01', effectiveTo: null, source: 'ЗДДФЛ чл. 48',   notes_ru: 'ДДФЛ — 10% плоска ставка' },
  dividendTax:      { value: 0.07,   effectiveFrom: '2026-01-01', effectiveTo: null, source: 'ЗДДФЛ чл. 38',   notes_ru: 'Данък дивиденти — 7%' },
  vat:              { value: 0.20,   effectiveFrom: '2026-01-01', effectiveTo: null, source: 'ЗДДС чл. 66',    notes_ru: 'ДДС — 20%' },
  vatHospitality:   { value: 0.09,   effectiveFrom: '2026-01-01', effectiveTo: null, source: 'ЗДДС чл. 66 ал.2', notes_ru: 'Намалена ставка за хотели — 9%' },
  vatThreshold:     { value: 51130,  effectiveFrom: '2026-01-01', effectiveTo: null, source: 'ЗДДС чл. 96',    notes_ru: 'Праг ДДС регистрация €/год' },

  // Официальные значения 2026 в EUR (ПМС 2025/2026)
  minWage:  { value: 620.20, effectiveFrom: '2026-01-01', effectiveTo: null, source: 'ПМС 2026', notes_ru: 'Минимална работна заплата (€)' },
  minOsig:  { value: 620.20, effectiveFrom: '2026-01-01', effectiveTo: null, source: 'ЗБДОО 2026', notes_ru: 'Минимален осигурителен доход за самоосигуряващи се (€)' },
  maxOsig:  { value: 2111.64,effectiveFrom: '2026-01-01', effectiveTo: null, source: 'ЗБДОО 2026', notes_ru: 'Максимален осигурителен доход (€)' },

  employer: {
    doo:  { value: 0.0982, source: 'КСО', notes_ru: 'ДОО Пенсии — работодател' },
    upf:  { value: 0.0282, source: 'КСО', notes_ru: 'ДЗПО УПФ — работодател' },
    zo:   { value: 0.0480, source: 'ЗЗО', notes_ru: 'Здравно осигуряване — работодател' },
    ozm:  { value: 0.0210, source: 'КСО', notes_ru: 'ОЗМ — работодател' },
    tzpb: { value: 0.0060, source: 'КСО', notes_ru: 'ТЗПБ (средно) — работодател' },
    bezr: { value: 0.0040, source: 'КСО', notes_ru: 'Безработица — работодател' },
  },
  employee: {
    doo:  { value: 0.0712, source: 'КСО', notes_ru: 'ДОО Пенсии — работник' },
    upf:  { value: 0.0218, source: 'КСО', notes_ru: 'ДЗПО УПФ — работник' },
    zo:   { value: 0.0320, source: 'ЗЗО', notes_ru: 'Здравно осигуряване — работник' },
    ozm:  { value: 0.0140, source: 'КСО', notes_ru: 'ОЗМ — работник' },
    bezr: { value: 0.0060, source: 'КСО', notes_ru: 'Безработица — работник' },
  },
  selfEmployed: {
    doo:      { value: 0.1480, source: 'КСО', notes_ru: 'ДОО Пенсии (с УПФ)' },
    dooNoUpf: { value: 0.1980, source: 'КСО', notes_ru: 'ДОО Пенсии (без УПФ, рождён до 1960)' },
    upf:      { value: 0.0500, source: 'КСО', notes_ru: 'ДЗПО УПФ' },
    zo:       { value: 0.0800, source: 'ЗЗО', notes_ru: 'Здравно осигуряване' },
    ozm:      { value: 0.0350, source: 'КСО', notes_ru: 'ОЗМ (по избор)' },
  },
  normativeExpenses: {
    et:   { value: 0.15, source: 'ЗДДФЛ чл. 26', notes_ru: 'Нормативни разходи ЕТ — 15%' },
    self: { value: 0.25, source: 'ЗДДФЛ чл. 29', notes_ru: 'Нормативни разходи самоосигуряващ — 25%' },
  },

  // Амортизационни норми по ЗКПО (категории)
  depreciation: {
    vehicles:   { value: 0.25, source: 'ЗКПО чл. 55', notes_ru: 'МПС — 25% годовых' },
    computers:  { value: 0.50, source: 'ЗКПО чл. 55', notes_ru: 'Компьютеры, IT-оборудование — 50% годовых' },
    furniture:  { value: 0.15, source: 'ЗКПО чл. 55', notes_ru: 'Мебель, офисное оборудование — 15% годовых' },
    buildings:  { value: 0.04, source: 'ЗКПО чл. 55', notes_ru: 'Здания — 4% годовых' },
    intangible: { value: 0.15, source: 'ЗКПО чл. 55', notes_ru: 'Нематериальные активы — 15% годовых' },
  },
} as const
