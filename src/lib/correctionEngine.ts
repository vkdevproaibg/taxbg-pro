import type { Transaction } from '../store/accountingStore'
import type { Employee } from '../store/employeesStore'
import { calculateObrazec1 } from './obrazec1'
import { getRateValue } from './taxRates'

// ─────────────────────────────────────────────────────────────
// Correction engine — detects the numeric impact of a tax rate
// change on already-closed periods. This module is a DETECTOR,
// not an auto-poster. It produces CorrectionDiff rows so that a
// superadmin can review and confirm each correction manually.
//
// Nothing here mutates storage. generateCorrectionBatch returns
// plain objects shaped for insert into journal_batches /
// journal_lines — the caller decides whether to persist them.
// ─────────────────────────────────────────────────────────────

export interface CorrectionDiff {
  period: string            // 'YYYY-MM'
  rateKey: string
  oldValue: number
  newValue: number
  affectedField: string     // 'totalEr' | 'totalEe' | 'incomeTax' | ...
  oldAmount: number
  newAmount: number
  difference: number
  warning?: string          // set when exact calculation is not possible
}

export interface DetectRateImpactOptions {
  rateKey: string
  oldValue: number
  newValue: number
  effectiveFrom: string
  effectiveTo: string | null
  companyId: string
  transactions: Transaction[]
  employees: Employee[]
}

// ── Shape of a single row insertable into journal_batches ───
export interface NewJournalBatch {
  company_id: string
  source_type: 'correction'
  source_id: string | null
  description: string
  created_by: string | null
  created_at: string
}

export interface NewJournalLine {
  batch_id: string            // set after batch insert; use '' as placeholder
  account_code: string
  debit: number
  credit: number
  description: string
}

// ── Period helpers ──────────────────────────────────────────

function periodsBetween(fromIso: string, toIso: string): string[] {
  const out: string[] = []
  const [fy, fm] = fromIso.split('-').map(Number)
  const [ty, tm] = toIso.split('-').map(Number)
  let y = fy
  let m = fm
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return out
}

function currentMonthIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ── Obrazec1 recomputation with a substituted rate ──────────
//
// calculateObrazec1() reads all rates from getRateValue() for
// the given period. To compare old vs new for ONE rate key, we
// temporarily shadow getRateValue for that one key by computing
// totals manually at both values, while letting other rates
// stay at their effective-at-period values.
//
// To avoid re-implementing the full payroll formula, we scale
// the affected contribution line by (newRate/oldRate).

const PAYROLL_RATE_KEYS = new Set([
  'employer.doo', 'employer.upf', 'employer.zo',
  'employer.ozm', 'employer.tzpb', 'employer.bezr',
  'employee.doo', 'employee.upf', 'employee.zo',
  'employee.ozm', 'employee.bezr',
])

function obrazec1RateField(rateKey: string): {
  side: 'er' | 'ee'
  bucket: 'doo' | 'upf' | 'zo' | 'ozm' | 'tzpb' | 'bezr'
} | null {
  const [side, bucket] = rateKey.split('.')
  if (side !== 'employer' && side !== 'employee') return null
  if (!['doo', 'upf', 'zo', 'ozm', 'tzpb', 'bezr'].includes(bucket)) return null
  return { side: side === 'employer' ? 'er' : 'ee', bucket: bucket as never }
}

// ── Main detector ───────────────────────────────────────────

export function detectRateImpact(opts: DetectRateImpactOptions): CorrectionDiff[] {
  const {
    rateKey, oldValue, newValue,
    effectiveFrom, effectiveTo,
    transactions, employees,
  } = opts

  const diffs: CorrectionDiff[] = []

  if (oldValue === newValue) return diffs

  const fromMonth = effectiveFrom.slice(0, 7)
  const toMonth = effectiveTo
    ? effectiveTo.slice(0, 7)
    : currentMonthIso()

  const periods = periodsBetween(fromMonth, toMonth)
  if (periods.length === 0) return diffs

  // ── Payroll-side rates ──
  if (PAYROLL_RATE_KEYS.has(rateKey)) {
    const map = obrazec1RateField(rateKey)
    if (!map) return diffs

    if (employees.length === 0) {
      diffs.push({
        period: periods[0],
        rateKey,
        oldValue,
        newValue,
        affectedField: 'n/a',
        oldAmount: 0,
        newAmount: 0,
        difference: 0,
        warning:
          'Няма активни служители за пресметане на разликата. ' +
          'Ако е имало служители в периода, трябва ръчна проверка.',
      })
      return diffs
    }

    for (const period of periods) {
      // Use the current obrazec1 calculation as the "new" baseline
      // (since it already reads the new rate from taxRates cache
      // via getRateValue()), then derive "old" by rescaling.
      const summary = calculateObrazec1(employees, period, '', '')

      const osigBaseTotal = summary.rows.reduce((s, r) => s + r.osigBase, 0)

      // Contribution using the new rate (already in totalEr/totalEe),
      // but isolate the one bucket we changed. We need the "line at new
      // rate" and "line at old rate" for just this bucket.
      const newBucketAmount = osigBaseTotal * newValue
      const oldBucketAmount = osigBaseTotal * oldValue
      const bucketDiff = newBucketAmount - oldBucketAmount

      // The affected payroll aggregate:
      //  - employer rates → totalEr and totalCost
      //  - employee rates → totalEe, and net/incomeTax shift because
      //    taxBase = gross - totalEe (ДДФЛ tax is on salary minus Ee).
      const affectedField =
        map.side === 'er'
          ? `totalEr.${map.bucket}`
          : `totalEe.${map.bucket}`

      diffs.push({
        period,
        rateKey,
        oldValue,
        newValue,
        affectedField,
        oldAmount: oldBucketAmount,
        newAmount: newBucketAmount,
        difference: bucketDiff,
      })

      // Employee-side rate changes also change ДДФЛ (10% on
      // gross - totalEe). The ДДФЛ shift equals -bucketDiff * ддфлStavka.
      if (map.side === 'ee') {
        const ddflRate = getRateValue('personalIncomeTax', period + '-01')
        const ddflShift = -bucketDiff * ddflRate
        diffs.push({
          period,
          rateKey,
          oldValue,
          newValue,
          affectedField: 'incomeTax',
          oldAmount: 0,
          newAmount: ddflShift,
          difference: ddflShift,
          warning:
            'ДДФЛ зависи от осиг. вноски на работника — корекцията е ' +
            'последица, не директна промяна на ставката.',
        })
      }
    }
    return diffs
  }

  // ── Corporate tax ──
  if (rateKey === 'corporateTax') {
    // Aggregate period result from transactions: income − expense.
    const fromDate = `${fromMonth}-01`
    const toDateExclusive = periods[periods.length - 1] + '-31'
    const periodTx = transactions.filter(
      t => t.date >= fromDate && t.date <= toDateExclusive,
    )

    const revenue = periodTx
      .filter(t => ['income', 'vat_out', 'appstore', 'googleplay', 'stripe'].includes(t.type))
      .reduce((s, t) => s + t.amount, 0)
    const expenses = periodTx
      .filter(t => ['expense', 'vat_in', 'salary', 'depreciation'].includes(t.type))
      .reduce((s, t) => s + t.amount, 0)

    const taxableProfit = Math.max(revenue - expenses, 0)
    const oldTax = taxableProfit * oldValue
    const newTax = taxableProfit * newValue

    diffs.push({
      period: `${fromMonth}..${periods[periods.length - 1]}`,
      rateKey,
      oldValue,
      newValue,
      affectedField: 'corporateTax',
      oldAmount: oldTax,
      newAmount: newTax,
      difference: newTax - oldTax,
      warning: taxableProfit === 0
        ? 'Няма облагаема печалба в периода — корекция не е нужна.'
        : undefined,
    })
    return diffs
  }

  // ── VAT threshold: warning only, no exact recalc ──
  if (rateKey === 'vatThreshold') {
    const fromDate = `${fromMonth}-01`
    const toDateExclusive = periods[periods.length - 1] + '-31'
    const income = transactions
      .filter(t =>
        t.date >= fromDate && t.date <= toDateExclusive &&
        ['income', 'vat_out', 'appstore', 'googleplay', 'stripe'].includes(t.type),
      )
      .reduce((s, t) => s + t.amount, 0)

    const low = Math.min(oldValue, newValue)
    const high = Math.max(oldValue, newValue)
    const inBand = income >= low && income < high

    diffs.push({
      period: `${fromMonth}..${periods[periods.length - 1]}`,
      rateKey,
      oldValue,
      newValue,
      affectedField: 'vatThreshold',
      oldAmount: income,
      newAmount: income,
      difference: 0,
      warning: inBand
        ? `Оборотът ${income.toFixed(2)} € попада между старата и новата граница. ` +
          'Регистрационният статут трябва да се провери ръчно.'
        : 'Прагът ДДС не изисква сметка — само правен преглед.',
    })
    return diffs
  }

  // ── Min wage: warning if any employee was in the band ──
  if (rateKey === 'minWage') {
    const low = Math.min(oldValue, newValue)
    const high = Math.max(oldValue, newValue)
    const inBand = employees.filter(e => e.grossSalary >= low && e.grossSalary < high)

    if (inBand.length === 0) {
      diffs.push({
        period: `${fromMonth}..${periods[periods.length - 1]}`,
        rateKey,
        oldValue,
        newValue,
        affectedField: 'minWage',
        oldAmount: 0,
        newAmount: 0,
        difference: 0,
        warning: 'Няма служители в диапазона между старата и новата МРЗ.',
      })
    } else {
      for (const emp of inBand) {
        diffs.push({
          period: `${fromMonth}..${periods[periods.length - 1]}`,
          rateKey,
          oldValue,
          newValue,
          affectedField: `minWage.${emp.name}`,
          oldAmount: emp.grossSalary,
          newAmount: newValue,
          difference: newValue - emp.grossSalary,
          warning:
            'Брутна заплата е под новата МРЗ — изисква нов трудов договор или анекс, ' +
            'не счетоводна корекция.',
        })
      }
    }
    return diffs
  }

  // ── Generic fallback: simple relative diff, no amounts ──
  diffs.push({
    period: `${fromMonth}..${periods[periods.length - 1]}`,
    rateKey,
    oldValue,
    newValue,
    affectedField: rateKey,
    oldAmount: 0,
    newAmount: 0,
    difference: 0,
    warning:
      'За тази ставка не е реализиран детайлен пресмятащ модул. ' +
      'Проверете ръчно дали има засегнати документи.',
  })
  return diffs
}

// ── Correction batch generator ──────────────────────────────
//
// Aggregates CorrectionDiff entries into a single correcting
// journal batch, posted in the CURRENT period (НСС 8 — closed
// periods are never modified, the fix is a new entry today).
//
// Payroll corrections book:
//   Dr 605 (Осигуровки) / Cr 453 (Задължения към бюджета)   when diff > 0 (more due)
//   Dr 453 / Cr 605                                           when diff < 0 (overpaid)
// Corporate tax corrections book:
//   Dr 123 (Печалби и загуби от предходни периоди — via 122) / Cr 453 when diff > 0
//
// The function does NOT write to the database; the caller does.

export function generateCorrectionBatch(
  diffs: CorrectionDiff[],
  companyId: string,
  reason: string,
): { batch: NewJournalBatch; lines: NewJournalLine[] } {
  const today = new Date().toISOString().slice(0, 10)
  const createdAt = new Date().toISOString()

  const batch: NewJournalBatch = {
    company_id: companyId,
    source_type: 'correction',
    source_id: null,
    description: reason,
    created_by: null,
    created_at: createdAt,
  }

  // Aggregate diffs by account pair.
  // Key: `${debit}:${credit}` → sumAmount
  const agg: Map<string, number> = new Map()

  const addLine = (debitAcc: string, creditAcc: string, amount: number) => {
    if (amount === 0) return
    const key = `${debitAcc}:${creditAcc}`
    agg.set(key, (agg.get(key) ?? 0) + amount)
  }

  for (const d of diffs) {
    if (d.difference === 0) continue

    // Employer payroll contributions → 605 Осигуровки за сметка на работодателя
    if (d.affectedField.startsWith('totalEr.')) {
      if (d.difference > 0) {
        addLine('605', '453', d.difference)
      } else {
        addLine('453', '605', -d.difference)
      }
      continue
    }

    // Employee payroll contributions → 421 (personnel) / 453 (budget)
    if (d.affectedField.startsWith('totalEe.')) {
      if (d.difference > 0) {
        addLine('421', '453', d.difference)
      } else {
        addLine('453', '421', -d.difference)
      }
      continue
    }

    // Income tax on salary (ДДФЛ)
    if (d.affectedField === 'incomeTax') {
      if (d.difference > 0) {
        addLine('421', '454', d.difference)
      } else {
        addLine('454', '421', -d.difference)
      }
      continue
    }

    // Corporate tax — correction of prior-period result goes
    // through 122 (retained earnings) on the debit side (if
    // underpaid) and 453 on the credit.
    if (d.affectedField === 'corporateTax') {
      if (d.difference > 0) {
        addLine('122', '453', d.difference)
      } else {
        addLine('453', '122', -d.difference)
      }
      continue
    }

    // Warning-only rows (minWage, vatThreshold, fallback) are
    // skipped — they cannot produce a journal entry on their own.
  }

  const lines: NewJournalLine[] = []
  for (const [key, amount] of agg) {
    const [debitAcc, creditAcc] = key.split(':')
    lines.push({
      batch_id: '',
      account_code: debitAcc,
      debit: Math.round(amount * 100) / 100,
      credit: 0,
      description: reason,
    })
    lines.push({
      batch_id: '',
      account_code: creditAcc,
      debit: 0,
      credit: Math.round(amount * 100) / 100,
      description: reason,
    })
  }

  return { batch, lines }
}
