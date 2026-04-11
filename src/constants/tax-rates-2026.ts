// ═══════════════════════════════════════════════════════════
// PATCH: src/constants/tax-rates-2026.ts
// Fixes: bezrabotica swap (K1 partial), minOsigSol separation (9.5)
//
// HOW TO APPLY:
// Replace the employer/employee/selfEmployed sections in tax-rates-2026.ts
// ═══════════════════════════════════════════════════════════

// ── BEFORE (wrong) ──────────────────────────────────────
//   employer: {
//     ...
//     bezr: { value: 0.0040, source: 'КСО', notes_ru: 'Безработица — работодател' },
//   },
//   employee: {
//     ...
//     bezr: { value: 0.0060, source: 'КСО', notes_ru: 'Безработица — работник' },
//   },

// ── AFTER (correct per КСО чл. 6 ал. 1 т. 5) ───────────
//   employer: {
//     ...
//     bezr: { value: 0.0060, source: 'КСО чл. 6 ал. 1 т. 5', notes_ru: 'Безработица — работодател 0.60%' },
//   },
//   employee: {
//     ...
//     bezr: { value: 0.0040, source: 'КСО чл. 6 ал. 1 т. 5', notes_ru: 'Безработица — работник 0.40%' },
//   },


// ── ALSO ADD after maxOsig ──────────────────────────────
// minOsigSol is NOT the same as minWage.
// МОД за самоосигуряващи = 550.66 € (1077 лв / 1.95583)
// МРЗ = 620.20 € — applies to employees only.
//
//   minOsigSol: { value: 550.66, effectiveFrom: '2026-01-01', effectiveTo: null,
//     source: 'ЗБДОО 2025 (действащ до приемане на нов)',
//     notes_ru: 'Минимален осигурителен доход за самоосигуряващи се (€)' },


// ═══════════════════════════════════════════════════════════
// Full corrected file (copy-paste replacement)
// ═══════════════════════════════════════════════════════════

import type { TaxRate } from './tax-rates-2025'

export interface TaxRateYear extends TaxRate {}

export const TAX_RATES_2026 = {
  corporateTax:     { value: 0.10,   effectiveFrom: '2026-01-01', effectiveTo: null, source: 'ЗКПО чл. 20',    notes_ru: 'Корпоративен данък — 10%' },
  personalIncomeTax:{ value: 0.10,   effectiveFrom: '2026-01-01', effectiveTo: null, source: 'ЗДДФЛ чл. 48',   notes_ru: 'ДДФЛ — 10% плоска ставка' },
  dividendTax:      { value: 0.05,   effectiveFrom: '2026-01-01', effectiveTo: null, source: 'ЗДДФЛ чл. 38 ал. 2',   notes_ru: 'Данък дивиденти — 5% (ЗДДФЛ чл. 38 ал. 2)' },
  vat:              { value: 0.20,   effectiveFrom: '2026-01-01', effectiveTo: null, source: 'ЗДДС чл. 66',    notes_ru: 'ДДС — 20%' },
  vatHospitality:   { value: 0.09,   effectiveFrom: '2026-01-01', effectiveTo: null, source: 'ЗДДС чл. 66 ал.2', notes_ru: 'Намалена ставка за хотели — 9%' },
  vatThreshold:     { value: 51130,  effectiveFrom: '2026-01-01', effectiveTo: null, source: 'ЗДДС чл. 96',    notes_ru: 'Праг ДДС регистрация €/год' },

  // Официальные значения 2026 в EUR
  // Действащи до приемане на ЗБДОО 2026 (Удължителен закон)
  minWage:     { value: 620.20,  effectiveFrom: '2026-01-01', effectiveTo: null, source: 'ПМС №243/2025', notes_ru: 'Минимална работна заплата (€) — за наети лица' },
  minOsig:     { value: 620.20,  effectiveFrom: '2026-01-01', effectiveTo: null, source: 'ПМС №243/2025', notes_ru: 'МОД за наети лица = МРЗ (€)' },
  minOsigSol:  { value: 550.66,  effectiveFrom: '2026-01-01', effectiveTo: null, source: 'ЗБДОО 2025 / Удължителен закон', notes_ru: 'МОД за самоосигуряващи се (€) — 1077 лв / 1.95583' },
  maxOsig:     { value: 2111.64, effectiveFrom: '2026-01-01', effectiveTo: null, source: 'ЗБДОО 2025 / Удължителен закон', notes_ru: 'Максимален осигурителен доход (€) — 4130 лв / 1.95583' },

  // ──────────────────────────────────────────────────────
  // Осигуровки за наети лица, III категория, родени след 1959
  // Действащи ставки (= 2025, до приемане на ЗБДОО 2026)
  //
  // NB: Стойностите по-долу отразяват ДЕЙСТВАЩИТЕ ставки
  // към 01.01.2026 по Удължителния закон (= ставки 2025).
  // При приемане на ЗБДОО 2026 стойностите ще бъдат
  // актуализирани чрез системата за версиониране.
  //
  // Безработица: работодател 0.60%, работник 0.40%
  // (КСО чл. 6, ал. 1, т. 5 — 60:40 разпределение)
  // ──────────────────────────────────────────────────────
  employer: {
    doo:  { value: 0.0822, source: 'КСО чл. 6 ал. 1 т. 1', notes_ru: 'ДОО Пенсии — работодател 8.22%' },
    upf:  { value: 0.0280, source: 'КСО чл. 157 ал. 1 т. 1', notes_ru: 'ДЗПО УПФ — работодател 2.80%' },
    zo:   { value: 0.0480, source: 'ЗЗО чл. 40', notes_ru: 'Здравно осигуряване — работодател 4.80%' },
    ozm:  { value: 0.0210, source: 'КСО чл. 6 ал. 1 т. 3', notes_ru: 'ОЗМ — работодател 2.10%' },
    tzpb: { value: 0.0060, source: 'КСО чл. 6 ал. 1 т. 4', notes_ru: 'ТЗПБ (средно) — работодател. Реалната ставка е 0.4–1.1% по дейност' },
    bezr: { value: 0.0060, source: 'КСО чл. 6 ал. 1 т. 5', notes_ru: 'Безработица — работодател 0.60%' },
  },
  employee: {
    doo:  { value: 0.0658, source: 'КСО чл. 6 ал. 1 т. 1', notes_ru: 'ДОО Пенсии — работник 6.58%' },
    upf:  { value: 0.0220, source: 'КСО чл. 157 ал. 1 т. 1', notes_ru: 'ДЗПО УПФ — работник 2.20%' },
    zo:   { value: 0.0320, source: 'ЗЗО чл. 40', notes_ru: 'Здравно осигуряване — работник 3.20%' },
    ozm:  { value: 0.0140, source: 'КСО чл. 6 ал. 1 т. 3', notes_ru: 'ОЗМ — работник 1.40%' },
    bezr: { value: 0.0040, source: 'КСО чл. 6 ал. 1 т. 5', notes_ru: 'Безработица — работник 0.40%' },
  },
  // Итого: работник 13.78%, работодател 18.12% + ТЗПБ (0.4–1.1%)
  // = 18.52–19.22% (средно ~18.92% при ТЗПБ 0.80%)

  selfEmployed: {
    // За СОЛ: всички вноски за своя сметка (не се делят 60:40)
    // doo тук = само фонд Пенсии (без УПФ)
    doo:      { value: 0.1480, source: 'КСО чл. 6 ал. 8', notes_ru: 'ДОО Пенсии — за родени след 1959 (вкл. ДЗПО)' },
    dooNoUpf: { value: 0.1980, source: 'КСО чл. 6 ал. 8', notes_ru: 'ДОО Пенсии — за родени преди 1960 (без ДЗПО)' },
    upf:      { value: 0.0500, source: 'КСО чл. 157 ал. 1 т. 1', notes_ru: 'ДЗПО УПФ (вкл. в doo за СОЛ — показан за справка)' },
    zo:       { value: 0.0800, source: 'ЗЗО чл. 40 ал. 1 т. 2', notes_ru: 'Здравно осигуряване — 8% изцяло за СОЛ' },
    ozm:      { value: 0.0350, source: 'КСО чл. 4 ал. 4', notes_ru: 'ОЗМ (по избор) — 3.50%' },
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

  // ──────────────────────────────────────────────────────
  // META: последна проверка
  // ──────────────────────────────────────────────────────
  _meta: {
    lastVerified: '2026-04-11',
    verifiedBy: 'audit session 1',
    budgetStatus: 'ЗБДОО 2026 НЕ Е ПРИЕТ — действат ставки 2025 по Удължителен закон',
    nextReview: '2026-07-01',
    sources: [
      'НАП — nra.bg/wps/portal/nra/osiguryavane/',
      'НОИ — nssi.bg/fizicheski-lica/osiguriavane/',
      'kik-info.com/spravochnik/osigurovki-i-danaci/ (01.01.2026)',
      'calcify.cc/bg/financial/personal-finance/salary-net-calculator',
      'ПМС №243/13.11.2025 (МРЗ 620.20 €)',
    ],
  },
} as const