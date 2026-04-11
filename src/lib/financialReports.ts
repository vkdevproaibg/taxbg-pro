import type { JournalEntry } from '../store/journalStore'
import type { Transaction } from '../store/accountingStore'
import { getRateValue } from './taxRates'

export interface OPRLine {
  code: string
  label_ru: string
  label_bg: string
  amount: number
  isTotal?: boolean
  isSubtotal?: boolean
  indent?: number
}

export interface OPRReport {
  period: string
  companyName: string
  lines: OPRLine[]
  totalRevenue: number
  totalExpenses: number
  financialResult: number
  taxableProfit: number
  corporateTax: number
  nonDeductible: number
  taxDue: number
  overpaid: number
  netProfit: number
  generatedAt: string
}

export interface BalanceSheet {
  period: string
  companyName: string
  // АКТИВИ
  fixedAssets: number          // Дълготрайни активи (сч. 205+206+207 - амортизация)
  currentAssets: number        // Текущи активи
  bankBalance: number          // Парични средства (сч. 503+501)
  debtors: number              // Вземания от клиенти (сч. 411)
  totalAssets: number
  // ПАСИВИ
  capital: number              // Собствен капитал (сч. 101)
  retainedEarnings: number     // Неразпределена печалба (сч. 122)
  currentProfit: number        // Текуща печалба
  creditors: number            // Задължения към доставчици (сч. 401)
  vatPayable: number           // ДДС за внасяне (сч. 451)
  salaryPayable: number        // Задължения към персонал (сч. 421)
  taxPayable: number           // Задължения към бюджета (сч. 453)
  totalLiabilities: number
  totalPassive: number
  // Balance check
  isBalanced: boolean
  difference: number
  generatedAt: string
}

export function calculateCorporateTax(
  financialResult: number,
  nonDeductible: number = 0,
  date: string = new Date().toISOString().slice(0, 10),
): { taxableProfit: number; corporateTax: number; netProfit: number } {
  const rate = getRateValue('corporateTax', date)
  const taxableProfit = Math.max(financialResult + nonDeductible, 0)
  const corporateTax = taxableProfit * rate
  const netProfit = financialResult - corporateTax
  return { taxableProfit, corporateTax, netProfit }
}

// Build OPR from journal entries + transactions
export function buildOPR(
  entries: JournalEntry[],
  transactions: Transaction[],
  from: string,
  to: string,
  companyName: string,
  advancePaid: number = 0
): OPRReport {
  const period = `${from} — ${to}`

  // Revenue lines — class 7 accounts (credit side)
  const rev703 = entries
    .filter(e => e.date >= from && e.date <= to && e.creditAccount === '703')
    .reduce((s, e) => s + e.amount, 0)
  const rev705 = entries
    .filter(e => e.date >= from && e.date <= to && e.creditAccount === '705')
    .reduce((s, e) => s + e.amount, 0)
  const rev729 = entries
    .filter(e => e.date >= from && e.date <= to && e.creditAccount === '729')
    .reduce((s, e) => s + e.amount, 0)

  // Expense lines — class 6 accounts (debit side)
  const exp602 = entries
    .filter(e => e.date >= from && e.date <= to && e.debitAccount === '602')
    .reduce((s, e) => s + e.amount, 0)
  const exp603 = entries
    .filter(e => e.date >= from && e.date <= to && e.debitAccount === '603')
    .reduce((s, e) => s + e.amount, 0)
  const exp604 = entries
    .filter(e => e.date >= from && e.date <= to && e.debitAccount === '604')
    .reduce((s, e) => s + e.amount, 0)
  const exp605 = entries
    .filter(e => e.date >= from && e.date <= to && e.debitAccount === '605')
    .reduce((s, e) => s + e.amount, 0)
  const exp606 = entries
    .filter(e => e.date >= from && e.date <= to && e.debitAccount === '606')
    .reduce((s, e) => s + e.amount, 0)
  const exp609 = entries
    .filter(e => e.date >= from && e.date <= to && e.debitAccount === '609')
    .reduce((s, e) => s + e.amount, 0)
  const exp601 = entries
    .filter(e => e.date >= from && e.date <= to && e.debitAccount === '601')
    .reduce((s, e) => s + e.amount, 0)

  const totalRevenue  = rev703 + rev705 + rev729
  const totalExpenses = exp601 + exp602 + exp603 + exp604 + exp605 + exp606 + exp609

  // Non-deductible expenses (ЗКПО чл. 26) — vehicle mixed use 50%
  const vehicleMixed = transactions
    .filter(t => t.date >= from && t.date <= to && t.type === 'vehicle_expense')
    .reduce((s, t) => s + t.amount * (1 - (t.deductiblePercent ?? 0.5)), 0)

  const financialResult = totalRevenue - totalExpenses
  const { taxableProfit, corporateTax, netProfit } = calculateCorporateTax(financialResult, vehicleMixed, from)
  const rawTaxDue = corporateTax - advancePaid
  const taxDue    = Math.max(rawTaxDue, 0)
  const overpaid  = rawTaxDue < 0 ? Math.abs(rawTaxDue) : 0

  const lines: OPRLine[] = [
    // ПРИХОДИ
    { code: 'I',    label_ru: 'ПРИХОДИ ОТ ДЕЙНОСТТА',           label_bg: 'ПРИХОДИ ОТ ДЕЙНОСТТА',         amount: totalRevenue,  isTotal: true },
    { code: '1',    label_ru: 'Приходи от продажба на услуги',   label_bg: 'Приходи от услуги (сч. 703)',   amount: rev703,        indent: 1 },
    { code: '2',    label_ru: 'Приходи от продажба на стоки',    label_bg: 'Приходи от стоки (сч. 705)',    amount: rev705,        indent: 1 },
    { code: '3',    label_ru: 'Прочие финансовые доходы',        label_bg: 'Финансови приходи (сч. 729)',   amount: rev729,        indent: 1 },

    // РАЗХОДИ
    { code: 'II',   label_ru: 'РАЗХОДИ ЗА ДЕЙНОСТТА',           label_bg: 'РАЗХОДИ ЗА ДЕЙНОСТТА',         amount: totalExpenses, isTotal: true },
    { code: '4',    label_ru: 'Материали и консумативи',         label_bg: 'Материали (сч. 601)',           amount: exp601,        indent: 1 },
    { code: '5',    label_ru: 'Внешние услуги',                  label_bg: 'Външни услуги (сч. 602)',       amount: exp602,        indent: 1 },
    { code: '6',    label_ru: 'Амортизация',                     label_bg: 'Амортизация (сч. 603)',         amount: exp603,        indent: 1 },
    { code: '7',    label_ru: 'Заработная плата',                label_bg: 'Разходи за заплати (сч. 604)', amount: exp604,        indent: 1 },
    { code: '8',    label_ru: 'Социальные взносы',               label_bg: 'Осигурителни вноски (сч. 605)',amount: exp605,        indent: 1 },
    { code: '9',    label_ru: 'Налоги и таксы',                  label_bg: 'Данъци и такси (сч. 606)',      amount: exp606,        indent: 1 },
    { code: '10',   label_ru: 'Прочие расходы',                  label_bg: 'Други разходи (сч. 609)',       amount: exp609,        indent: 1 },

    // RESULT
    { code: 'III',  label_ru: 'ФИНАНСОВЫЙ РЕЗУЛЬТАТ',            label_bg: 'ФИНАНСОВ РЕЗУЛТАТ',            amount: financialResult, isSubtotal: true },
    { code: 'IV',   label_ru: 'Непризнаваемые расходы (ЗКПО)',   label_bg: 'Непризнати разходи',           amount: vehicleMixed,  indent: 1 },
    { code: 'V',    label_ru: 'ДАНЪЧНА ПЕЧАЛБА',                 label_bg: 'ДАНЪЧНА ПЕЧАЛБА',              amount: taxableProfit,  isSubtotal: true },
    { code: 'VI',   label_ru: 'Корпоративен данък 10%',          label_bg: 'Корпоративен данък (10%)',     amount: corporateTax,  indent: 1 },
    { code: 'VII',  label_ru: 'Аванси уплатены',                 label_bg: 'Платени аванси',               amount: advancePaid,   indent: 1 },
    { code: 'VIII', label_ru: 'Данък за довнасяне',              label_bg: 'Данък за довнасяне',           amount: taxDue,        indent: 1 },
    { code: 'IX',   label_ru: 'ЧИСТА ПЕЧАЛБА / ЗАГУБА',         label_bg: 'ЧИСТА ПЕЧАЛБА / ЗАГУБА',       amount: netProfit,     isTotal: true },
  ].filter(line => line.amount !== 0 || line.isTotal || line.isSubtotal)

  return {
    period, companyName, lines,
    totalRevenue, totalExpenses,
    financialResult, taxableProfit,
    corporateTax, nonDeductible: vehicleMixed, taxDue, overpaid, netProfit,
    generatedAt: new Date().toISOString(),
  }
}

// Build Balance Sheet — all values computed from journal entries
export function buildBalanceSheet(
  entries: JournalEntry[],
  upToDate: string,
  companyName: string,
  transactions?: Transaction[],
): BalanceSheet {
  const sumAccount = (account: string, side: 'debit' | 'credit'): number =>
    entries
      .filter(e =>
        e.date <= upToDate &&
        (side === 'debit'
          ? e.debitAccount === account
          : e.creditAccount === account)
      )
      .reduce((s, e) => s + e.amount, 0)

  // ── АКТИВИ ──────────────────────────────────

  // Bank account (503 — Разплащателна сметка)
  const bankBalance = Math.max(
    sumAccount('503', 'debit') - sumAccount('503', 'credit'),
    0
  )

  // Fixed assets net of depreciation
  const computers  = sumAccount('205', 'debit') - sumAccount('241', 'credit')
  const vehicles   = sumAccount('206', 'debit') - sumAccount('246', 'credit')
  const furniture  = sumAccount('207', 'debit')
  const fixedAssets = Math.max(computers + vehicles + furniture, 0)

  // Debtors (411 — Вземания от клиенти)
  const debtorsBalance = Math.max(
    sumAccount('411', 'debit') - sumAccount('411', 'credit'),
    0
  )

  const currentAssets = debtorsBalance
  const totalAssets   = fixedAssets + currentAssets + bankBalance

  // ── ПАСИВИ ──────────────────────────────────

  // Capital (101 = basic capital, 102 = registered capital)
  const capitalFromEntries =
    (sumAccount('101', 'credit') - sumAccount('101', 'debit')) +
    (sumAccount('102', 'credit') - sumAccount('102', 'debit'))

  // If no capital entries exist yet, use minimum (1 €).
  // A capital entry (Дт 503 / Кт 102) should be created
  // when the company is first set up.
  const capitalAmount = capitalFromEntries > 0 ? capitalFromEntries : 1

  // Creditors (401 — Задължения към доставчици)
  const creditorsBalance = Math.max(
    sumAccount('401', 'credit') - sumAccount('401', 'debit'),
    0
  )

  // VAT payable (451 output VAT − 452 input VAT credit)
  const vatPayable = Math.max(
    sumAccount('451', 'credit') - sumAccount('452', 'debit'),
    0
  )

  // Salary payable (421)
  const salaryPayable = Math.max(
    sumAccount('421', 'credit') - sumAccount('421', 'debit'),
    0
  )

  // Tax payable (453)
  const taxPayable = Math.max(
    sumAccount('453', 'credit') - sumAccount('453', 'debit'),
    0
  )

  // Current profit from OPR (revenue − expenses)
  const totalRevenue  =
    sumAccount('703', 'credit') +
    sumAccount('705', 'credit') +
    sumAccount('729', 'credit')
  const totalExpenses =
    sumAccount('601', 'debit') + sumAccount('602', 'debit') +
    sumAccount('603', 'debit') + sumAccount('604', 'debit') +
    sumAccount('605', 'debit') + sumAccount('606', 'debit') +
    sumAccount('609', 'debit')
  const financialResult = totalRevenue - totalExpenses

  const nonDeductible = (transactions ?? [])
    .filter(t => t.date <= upToDate && t.type === 'vehicle_expense')
    .reduce((s, t) => s + t.amount * (1 - (t.deductiblePercent ?? 0.5)), 0)

  const { netProfit } = calculateCorporateTax(financialResult, nonDeductible, upToDate)

  const retainedEarnings = sumAccount('122', 'credit') - sumAccount('122', 'debit')

  const totalLiabilities =
    creditorsBalance + vatPayable + salaryPayable + taxPayable

  const totalPassive = capitalAmount + retainedEarnings + netProfit + totalLiabilities

  const difference = Math.abs(totalAssets - totalPassive)
  const isBalanced = difference < 0.01

  return {
    period: upToDate,
    companyName,
    fixedAssets, currentAssets, bankBalance,
    debtors: debtorsBalance,
    totalAssets,
    capital: capitalAmount,
    retainedEarnings,
    currentProfit: netProfit,
    creditors: creditorsBalance,
    vatPayable,
    salaryPayable,
    taxPayable,
    totalLiabilities,
    totalPassive,
    isBalanced,
    difference,
    generatedAt: new Date().toISOString(),
  }
}

// Export OPR to CSV
export function oprToCsv(report: OPRReport): string {
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = [
    `# ОПР · ${report.companyName} · ${report.period}`,
    [q('Код'), q('Наименование'), q('Сумма (€)')].join(';'),
    ...report.lines.map(l => [
      q(l.code),
      q(l.label_bg),
      q(l.amount.toFixed(2)),
    ].join(';')),
  ]
  return lines.join('\n')
}

// Export Balance to CSV
export function balanceToCsv(sheet: BalanceSheet): string {
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`
  const rows = [
    ['АКТИВИ', ''],
    ['Дълготрайни активи', sheet.fixedAssets.toFixed(2)],
    ['Вземания от клиенти', sheet.debtors.toFixed(2)],
    ['Парични средства', sheet.bankBalance.toFixed(2)],
    ['ОБЩО АКТИВИ', sheet.totalAssets.toFixed(2)],
    ['', ''],
    ['ПАСИВИ', ''],
    ['Основен капитал', sheet.capital.toFixed(2)],
    ['Текуща печалба', sheet.currentProfit.toFixed(2)],
    ['Задължения към доставчици', sheet.creditors.toFixed(2)],
    ['ДДС за внасяне', sheet.vatPayable.toFixed(2)],
    ['Задължения персонал', sheet.salaryPayable.toFixed(2)],
    ['Данъчни задължения', sheet.taxPayable.toFixed(2)],
    ['ОБЩО ПАСИВИ', sheet.totalPassive.toFixed(2)],
    ['', ''],
    ['БАЛАНС СХОДИТСЯ', sheet.isBalanced ? 'ДА ✓' : `НЕ ✗ (разлика ${sheet.difference.toFixed(2)} €)`],
  ]
  return [
    `# Баланс · ${sheet.companyName} · към ${sheet.period}`,
    [q('Показател'), q('Сума (€)')].join(';'),
    ...rows.map(r => r.map(v => q(String(v))).join(';')),
  ].join('\n')
}
