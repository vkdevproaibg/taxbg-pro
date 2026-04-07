import type { Transaction, TransactionType } from '../store/accountingStore'

export interface ImportSummary {
  platform: string
  period: string
  totalNet: number
  count: number
  refunds: number
}

export interface ImportResult {
  transactions: Omit<Transaction, 'id'>[]
  errors: string[]
  summary: ImportSummary
}

function splitRows(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter(Boolean)
}

function splitColumns(row: string): string[] {
  if (row.includes('\t')) return row.split('\t').map((x) => x.trim())
  if (row.includes(';')) return row.split(';').map((x) => x.trim())
  return row.split(',').map((x) => x.trim())
}

function normalizeHeader(v: string): string {
  return v.toLowerCase().replace(/["']/g, '').trim()
}

function parseAmount(raw: string): number | null {
  const cleaned = raw
    .replace(/[^\d,.\-]/g, '')
    .replace(',', '.')
    .trim()
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function parseDate(raw: string): string {
  const value = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const m = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
  if (!m) return new Date().toISOString().slice(0, 10)
  const dd = m[1].padStart(2, '0')
  const mm = m[2].padStart(2, '0')
  const yyyy = m[3]
  return `${yyyy}-${mm}-${dd}`
}

function detectType(description: string, amount: number, platform: TransactionType): TransactionType {
  const d = description.toLowerCase()
  if (d.includes('refund') || d.includes('chargeback') || amount < 0) return 'refund'
  return platform
}

function parseGeneric(text: string, platformType: 'appstore' | 'googleplay'): ImportResult {
  const rows = splitRows(text)
  const errors: string[] = []
  if (rows.length < 2) {
    return {
      transactions: [],
      errors: ['Файлът изглежда празен или няма достатъчно редове.'],
      summary: { platform: platformType === 'appstore' ? 'App Store' : 'Google Play', period: '-', totalNet: 0, count: 0, refunds: 0 },
    }
  }

  const header = splitColumns(rows[0]).map(normalizeHeader)
  const dateIdx = header.findIndex((h) => /date|дата/.test(h))
  const amountIdx = header.findIndex((h) => /amount|net|proceeds|earnings|сума/.test(h))
  const descIdx = header.findIndex((h) => /description|title|product|item|опис/.test(h))
  const feeIdx = header.findIndex((h) => /fee|commission|комиси/.test(h))
  const grossIdx = header.findIndex((h) => /gross|customer price|брут/.test(h))

  if (dateIdx === -1 || amountIdx === -1) {
    errors.push('Липсват колони за дата и/или сума.')
  }

  const transactions: Omit<Transaction, 'id'>[] = []
  for (const row of rows.slice(1)) {
    const cols = splitColumns(row)
    if (cols.length < 2) continue

    const rawAmount = cols[amountIdx] ?? ''
    const parsed = parseAmount(rawAmount)
    if (parsed == null) continue

    const absAmount = Number(Math.abs(parsed).toFixed(2))
    const description = (cols[descIdx] ?? `${platformType} payout`).trim() || `${platformType} payout`
    const txType = detectType(description, parsed, platformType)
    const fee = feeIdx >= 0 ? parseAmount(cols[feeIdx] ?? '') : null
    const gross = grossIdx >= 0 ? parseAmount(cols[grossIdx] ?? '') : null

    transactions.push({
      date: parseDate(cols[dateIdx] ?? ''),
      description,
      amount: absAmount,
      type: txType,
      platformFee: fee == null ? undefined : Math.abs(fee),
      grossAmount: gross == null ? undefined : Math.abs(gross),
      counterparty: platformType === 'appstore' ? 'Apple' : 'Google',
      vatRate: 0,
      vatAmount: 0,
    })
  }

  const refunds = transactions.filter((t) => t.type === 'refund').length
  const totalNet = transactions.reduce((s, t) => s + (t.type === 'refund' ? -t.amount : t.amount), 0)
  const dates = transactions.map((t) => t.date).sort()
  const period = dates.length > 0 ? `${dates[0]} .. ${dates[dates.length - 1]}` : '-'

  return {
    transactions,
    errors,
    summary: {
      platform: platformType === 'appstore' ? 'App Store' : 'Google Play',
      period,
      totalNet: Number(totalNet.toFixed(2)),
      count: transactions.length,
      refunds,
    },
  }
}

export function detectPlatform(text: string): 'appstore' | 'googleplay' | 'unknown' {
  const l = text.toLowerCase()
  if (l.includes('app store') || l.includes('apple')) return 'appstore'
  if (l.includes('google play') || l.includes('merchant id') || l.includes('order number')) return 'googleplay'
  return 'unknown'
}

export function parseAppStoreCsv(text: string): ImportResult {
  return parseGeneric(text, 'appstore')
}

export function parseGooglePlayCsv(text: string): ImportResult {
  return parseGeneric(text, 'googleplay')
}
