import { DEADLINES_2025, DEADLINES_2026, type LegalForm } from '../constants/deadlines'
import { TAX_RATES_2025 } from '../constants/tax-rates-2025'
import { TAX_RATES_2026 } from '../constants/tax-rates-2026'

function parsePeriod(period: string): { year: number; month: number } {
  const [yearStr, monthStr] = period.split('-')
  const year = Number(yearStr) || new Date().getFullYear()
  const month = Number(monthStr) || new Date().getMonth() + 1
  return { year, month }
}

function daysUntil(date: Date): number {
  const now = new Date()
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.ceil((startDate.getTime() - startNow.getTime()) / 86400000)
}

export function buildAuditorReport(options: {
  legalForm: LegalForm
  taxPeriod: string
  companyName?: string
}): string {
  const { year, month } = parsePeriod(options.taxPeriod)
  const deadlines = year >= 2026 ? DEADLINES_2026 : DEADLINES_2025
  const rates = year >= 2026 ? TAX_RATES_2026 : TAX_RATES_2025
  const periodDate = new Date(year, month - 1, 1)

  const relevant = deadlines
    .filter((d) => d.forms.includes(options.legalForm))
    .map((d) => {
      const targetMonth = d.isMonthly ? month : d.month
      const date = new Date(periodDate.getFullYear(), targetMonth - 1, d.day)
      return { d, date, delta: daysUntil(date) }
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  const overdue = relevant.filter((x) => x.delta < 0).slice(0, 3)
  const upcoming = relevant.filter((x) => x.delta >= 0 && x.delta <= 14).slice(0, 4)

  const lines: string[] = []
  lines.push(`Аудит-режим активен (${year}-${String(month).padStart(2, '0')}).`)
  if (options.companyName) lines.push(`Компания: ${options.companyName}.`)
  lines.push(
    `Ключевые ставки периода: КНП ${rates.corporateTax.value * 100}%, ДДС ${rates.vat.value * 100}%, дивидент ${rates.dividendTax.value * 100}%.`,
  )

  if (overdue.length > 0) {
    lines.push('Отклонения/просрочки:')
    overdue.forEach((x) => {
      lines.push(`- ${x.d.title_ru}: просрочено на ${Math.abs(x.delta)} дн. (${x.d.penaltyInfo_ru})`)
    })
  } else {
    lines.push('Просроченных обязательств по выбранному периоду не обнаружено.')
  }

  if (upcoming.length > 0) {
    lines.push('Сделать в ближайшее время:')
    upcoming.forEach((x) => {
      lines.push(`- ${x.d.title_ru}: через ${x.delta} дн.`)
    })
  } else {
    lines.push('На ближайшие 14 дней новых обязательств не найдено.')
  }

  lines.push('Рекомендация: проверьте первичку и банковские операции до закрытия периода.')
  return lines.join('\n')
}
