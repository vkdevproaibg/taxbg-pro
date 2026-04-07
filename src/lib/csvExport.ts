import type { Transaction } from '../store/accountingStore'
import { format } from 'date-fns'

const TYPE_LABELS: Record<string, string> = {
  income: 'Приход', vat_out: 'Продажба с ДДС', expense: 'Разход',
  vat_in: 'Покупка с ДДС', appstore: 'App Store', googleplay: 'Google Play',
  stripe: 'Stripe', salary: 'Заплата', dividend: 'Дивидент', refund: 'Refund',
  asset_purchase: 'Покупка ОС', depreciation: 'Амортизация',
  vehicle_tax: 'Данък МПС', vehicle_expense: 'Разход МПС',
}

function q(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

export function exportTransactionsCsv(
  transactions: Transaction[],
  from: string,
  to: string,
  companyName: string
): void {
  const filtered = transactions
    .filter(t => t.date >= from && t.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date))

  const headers = [
    'Дата', 'Тип', 'Описание', 'Контрагент', '№ фактура',
    'Сума (€)', 'ДДС ставка', 'ДДС (€)', 'Актив/МПС', 'Община', 'Признат %',
  ]

  const rows = filtered.map(t => [
    t.date,
    TYPE_LABELS[t.type] ?? t.type,
    t.description,
    t.counterparty ?? '',
    t.invoiceNumber ?? '',
    t.amount.toFixed(2),
    t.vatRate !== undefined ? `${(t.vatRate * 100).toFixed(0)}%` : '',
    t.vatAmount !== undefined ? t.vatAmount.toFixed(2) : '',
    t.assetName ?? '',
    t.municipality ?? '',
    t.deductiblePercent !== undefined ? `${t.deductiblePercent * 100}%` : '',
  ])

  const csv = [
    `# ${companyName || 'Company'} · Транзакции ${from} — ${to} · Экспорт ${format(new Date(), 'yyyy-MM-dd')}`,
    headers.map(q).join(';'),
    ...rows.map(r => r.map(q).join(';')),
  ].join('\n')

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `taxbg_${(companyName || 'export').replace(/\s+/g, '_')}_${from}_${to}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
