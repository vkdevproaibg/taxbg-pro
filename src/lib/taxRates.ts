import { supabase } from './supabase'
import { TAX_RATES_2026 } from '../constants/tax-rates-2026'

export interface TaxRateEntry {
  value: number
  effective_from: string
  effective_to: string | null
  legal_basis: string
  notes_ru?: string | null
  notes_bg?: string | null
  source: 'db' | 'fallback'
}

interface DbRow {
  rate_key: string
  value: number
  effective_from: string
  effective_to: string | null
  legal_basis: string
  notes_ru: string | null
  notes_bg: string | null
  is_active: boolean
}

// Module-level cache: rate_key -> list of entries sorted by effective_from desc
const rateCache: Map<string, TaxRateEntry[]> = new Map()
let cacheLoaded = false

// ── FALLBACK: build flat map from static TAX_RATES_2026 ─────
// Keys use dot notation for nested groups (e.g. "employer.doo",
// "selfEmployed.upf", "normativeExpenses.self").
type StaticRate = { value: number; source?: string; notes_ru?: string; effectiveFrom?: string; effectiveTo?: string | null }

function buildFallbackMap(): Map<string, TaxRateEntry> {
  const map = new Map<string, TaxRateEntry>()
  const add = (key: string, raw: StaticRate) => {
    map.set(key, {
      value: raw.value,
      effective_from: raw.effectiveFrom ?? '2026-01-01',
      effective_to: raw.effectiveTo ?? null,
      legal_basis: raw.source ?? '',
      notes_ru: raw.notes_ru ?? null,
      notes_bg: null,
      source: 'fallback',
    })
  }

  const r = TAX_RATES_2026 as unknown as Record<string, unknown>

  // Flat keys
  const flatKeys = [
    'corporateTax', 'personalIncomeTax', 'dividendTax',
    'vat', 'vatHospitality', 'vatThreshold',
    'minWage', 'minOsig', 'minOsigSol', 'maxOsig',
  ]
  for (const k of flatKeys) {
    const v = r[k] as StaticRate | undefined
    if (v && typeof v.value === 'number') add(k, v)
  }

  // Nested groups — dot notation
  const groups = ['employer', 'employee', 'selfEmployed', 'normativeExpenses', 'depreciation']
  for (const g of groups) {
    const group = r[g] as Record<string, StaticRate> | undefined
    if (!group) continue
    for (const [sub, val] of Object.entries(group)) {
      if (val && typeof val.value === 'number') {
        add(`${g}.${sub}`, val)
      }
    }
  }

  return map
}

const FALLBACK_MAP = buildFallbackMap()

// ── Public API ──────────────────────────────────────────────

export async function loadTaxRates(): Promise<void> {
  if (!supabase) {
    cacheLoaded = true
    return
  }

  try {
    const { data, error } = await supabase
      .from('tax_rate_versions')
      .select('rate_key, value, effective_from, effective_to, legal_basis, notes_ru, notes_bg, is_active')
      .eq('is_active', true)
      .order('effective_from', { ascending: false })

    if (error) throw error

    rateCache.clear()
    for (const row of (data ?? []) as DbRow[]) {
      const entry: TaxRateEntry = {
        value: Number(row.value),
        effective_from: row.effective_from,
        effective_to: row.effective_to,
        legal_basis: row.legal_basis,
        notes_ru: row.notes_ru,
        notes_bg: row.notes_bg,
        source: 'db',
      }
      const list = rateCache.get(row.rate_key) ?? []
      list.push(entry)
      rateCache.set(row.rate_key, list)
    }
    cacheLoaded = true
  } catch (err) {
    console.warn('[taxRates] loadTaxRates failed, will use fallback:', err)
    cacheLoaded = true
  }
}

export function getRateAt(key: string, date: string): TaxRateEntry | null {
  const list = rateCache.get(key)
  if (list && list.length > 0) {
    for (const entry of list) {
      if (
        entry.effective_from <= date &&
        (entry.effective_to === null || entry.effective_to >= date)
      ) {
        return entry
      }
    }
  }

  const fb = FALLBACK_MAP.get(key)
  if (fb) {
    if (
      fb.effective_from <= date &&
      (fb.effective_to === null || fb.effective_to >= date)
    ) {
      return fb
    }
    return fb
  }
  return null
}

export function getRateValue(key: string, date: string): number {
  const entry = getRateAt(key, date)
  if (!entry) {
    console.warn(`[taxRates] rate "${key}" not found for date ${date}`)
    return 0
  }
  return entry.value
}

export function getAllRatesAt(date: string): Record<string, TaxRateEntry> {
  const result: Record<string, TaxRateEntry> = {}
  const keys = new Set<string>([
    ...rateCache.keys(),
    ...FALLBACK_MAP.keys(),
  ])
  for (const key of keys) {
    const entry = getRateAt(key, date)
    if (entry) result[key] = entry
  }
  return result
}

export function isRatesCacheLoaded(): boolean {
  return cacheLoaded
}
