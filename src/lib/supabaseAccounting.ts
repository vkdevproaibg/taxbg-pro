// src/lib/supabaseAccounting.ts
// Supabase CRUD for transactions + journal batches/lines.
// Called by accountingStore and journalStore.
// Never imported directly in components — go through the stores.

import { supabase } from './supabase'
import type { Transaction } from '../store/accountingStore'
import type { JournalEntry } from '../store/journalStore'

// ── Type mapping: Transaction → Supabase row ─────────────────────────────────

function txToSupabase(t: Transaction, companyId: string) {
  return {
    id:                 t.id,
    company_id:         companyId,
    date:               t.date,
    type:               t.type,
    amount:             t.amount,
    description:        t.description,
    vat_rate:           t.vatRate ?? null,
    vat_amount:         t.vatAmount ?? null,
    counterparty:       t.counterparty ?? null,
    invoice_number:     t.invoiceNumber ?? null,
    gross_amount:       t.grossAmount ?? null,
    platform_fee:       t.platformFee ?? null,
    asset_name:         t.assetName ?? null,
    asset_value:        t.assetValue ?? null,
    depreciation_rate:  t.depreciationRate ?? null,
    deductible_percent: t.deductiblePercent ?? null,
    municipality:       t.municipality ?? null,
    is_deferred:        t.isDeferred ?? false,
    status:             'approved' as const,
  }
}

function txFromSupabase(row: Record<string, unknown>): Transaction {
  return {
    id:                (row.id as string),
    date:              (row.date as string),
    type:              (row.type as Transaction['type']),
    amount:            (row.amount as number),
    description:       (row.description as string),
    vatRate:           (row.vat_rate as Transaction['vatRate']) ?? undefined,
    vatAmount:         (row.vat_amount as number) ?? undefined,
    counterparty:      (row.counterparty as string) ?? undefined,
    invoiceNumber:     (row.invoice_number as string) ?? undefined,
    grossAmount:       (row.gross_amount as number) ?? undefined,
    platformFee:       (row.platform_fee as number) ?? undefined,
    assetName:         (row.asset_name as string) ?? undefined,
    assetValue:        (row.asset_value as number) ?? undefined,
    depreciationRate:  (row.depreciation_rate as number) ?? undefined,
    deductiblePercent: (row.deductible_percent as number) ?? undefined,
    municipality:      (row.municipality as string) ?? undefined,
    isDeferred:        (row.is_deferred as boolean) ?? false,
    companyId:         (row.company_id as string),
  }
}

// ── Type mapping: JournalEntry → batch + lines ───────────────────────────────
// Old format: one row with debitAccount + creditAccount
// New format: journal_batch + two journal_lines

function journalEntryToBatchAndLines(entry: JournalEntry, companyId: string) {
  const batch = {
    id:          entry.id,
    company_id:  companyId,
    source_type: entry.source === 'manual' ? 'manual' : 'transaction',
    source_id:   entry.linkedTransactionId ?? null,
    description: entry.description,
    created_at:  entry.date + 'T00:00:00Z',
  }

  const lines = [
    {
      batch_id:     entry.id,
      account_code: entry.debitAccount,
      debit:        entry.amount,
      credit:       0,
      description:  entry.description,
    },
    {
      batch_id:     entry.id,
      account_code: entry.creditAccount,
      debit:        0,
      credit:       entry.amount,
      description:  entry.description,
    },
  ]

  return { batch, lines }
}

function batchAndLinesToJournalEntry(
  batch: Record<string, unknown>,
  lines: Record<string, unknown>[]
): JournalEntry | null {
  const debitLine  = lines.find((l) => (l.debit as number) > 0)
  const creditLine = lines.find((l) => (l.credit as number) > 0)

  if (!debitLine || !creditLine) return null

  const createdAt = batch.created_at as string
  const date = createdAt.split('T')[0]

  return {
    id:                  batch.id as string,
    date,
    description:         batch.description as string,
    debitAccount:        debitLine.account_code as string,
    creditAccount:       creditLine.account_code as string,
    amount:              debitLine.debit as number,
    linkedTransactionId: (batch.source_id as string) ?? undefined,
    source:              batch.source_type === 'manual' ? 'manual' : 'auto',
    period:              date.substring(0, 7),
    companyId:           batch.company_id as string,
  }
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchTransactions(
  companyId: string,
  from?: string,
  to?: string
): Promise<Transaction[]> {
  if (!supabase) return []

  let query = supabase
    .from('transactions')
    .select('*')
    .eq('company_id', companyId)
    .order('date', { ascending: false })

  if (from) query = query.gte('date', from)
  if (to)   query = query.lte('date', to)

  const { data, error } = await query

  if (error) {
    console.error('fetchTransactions error:', error)
    return []
  }

  return (data ?? []).map(txFromSupabase)
}

export async function fetchJournalEntries(
  companyId: string
): Promise<JournalEntry[]> {
  if (!supabase) return []

  const { data: batches, error } = await supabase
    .from('journal_batches')
    .select('*, journal_lines(*)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('fetchJournalEntries error:', error)
    return []
  }

  const entries: JournalEntry[] = []
  for (const batch of batches ?? []) {
    const entry = batchAndLinesToJournalEntry(
      batch as Record<string, unknown>,
      (batch.journal_lines ?? []) as Record<string, unknown>[]
    )
    if (entry) entries.push(entry)
  }

  return entries
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createTransaction(
  tx: Transaction,
  journalEntry: JournalEntry | null,
  vatJournalEntry: JournalEntry | null,
  companyId: string
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }

  const { error: txError } = await supabase
    .from('transactions')
    .insert(txToSupabase(tx, companyId))

  if (txError) return { error: txError.message }

  if (journalEntry) {
    const { batch, lines } = journalEntryToBatchAndLines(journalEntry, companyId)

    const { error: batchError } = await supabase
      .from('journal_batches')
      .insert(batch)

    if (batchError) return { error: batchError.message }

    const { error: linesError } = await supabase
      .from('journal_lines')
      .insert(lines)

    if (linesError) return { error: linesError.message }
  }

  if (vatJournalEntry) {
    const { batch: vatBatch, lines: vatLines } =
      journalEntryToBatchAndLines(vatJournalEntry, companyId)

    await supabase.from('journal_batches').insert(vatBatch)
    await supabase.from('journal_lines').insert(vatLines)
  }

  return { error: null }
}

export async function updateTransactionInSupabase(
  id: string,
  patch: Partial<Transaction>
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }

  const updateData: Record<string, unknown> = {}
  if (patch.date        !== undefined) updateData.date         = patch.date
  if (patch.amount      !== undefined) updateData.amount       = patch.amount
  if (patch.description !== undefined) updateData.description  = patch.description
  if (patch.type        !== undefined) updateData.type         = patch.type
  if (patch.vatRate     !== undefined) updateData.vat_rate     = patch.vatRate
  if (patch.vatAmount   !== undefined) updateData.vat_amount   = patch.vatAmount
  if (patch.counterparty    !== undefined) updateData.counterparty   = patch.counterparty
  if (patch.invoiceNumber   !== undefined) updateData.invoice_number = patch.invoiceNumber
  if (patch.grossAmount     !== undefined) updateData.gross_amount   = patch.grossAmount
  if (patch.platformFee     !== undefined) updateData.platform_fee   = patch.platformFee
  if (patch.assetName       !== undefined) updateData.asset_name     = patch.assetName
  if (patch.assetValue      !== undefined) updateData.asset_value    = patch.assetValue
  if (patch.depreciationRate !== undefined) updateData.depreciation_rate = patch.depreciationRate
  if (patch.deductiblePercent !== undefined) updateData.deductible_percent = patch.deductiblePercent
  if (patch.municipality    !== undefined) updateData.municipality   = patch.municipality
  if (patch.isDeferred      !== undefined) updateData.is_deferred    = patch.isDeferred

  const { error } = await supabase
    .from('transactions')
    .update(updateData)
    .eq('id', id)

  return { error: error ? error.message : null }
}

export async function deleteTransactionFromSupabase(
  id: string
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }

  // Delete journal batches linked to this transaction
  // (journal_lines cascade-delete via FK)
  await supabase
    .from('journal_batches')
    .delete()
    .eq('source_id', id)

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  return { error: error ? error.message : null }
}

// ── Import from localStorage (one-time migration) ─────────────────────────────

export async function importLocalAccountingData(
  transactions: Transaction[],
  journalEntries: JournalEntry[],
  companyId: string
): Promise<{ imported: number; error: string | null }> {
  if (!supabase) return { imported: 0, error: 'Supabase not configured' }
  if (transactions.length === 0) return { imported: 0, error: null }

  // Upsert all transactions
  const txRows = transactions.map((t) => txToSupabase(t, companyId))
  const { error: txError } = await supabase
    .from('transactions')
    .upsert(txRows, { onConflict: 'id' })

  if (txError) return { imported: 0, error: txError.message }

  // Upsert journal batches and lines
  for (const entry of journalEntries) {
    const { batch, lines } = journalEntryToBatchAndLines(entry, companyId)

    await supabase
      .from('journal_batches')
      .upsert(batch, { onConflict: 'id' })

    // Delete old lines first to avoid duplicates, then re-insert
    await supabase.from('journal_lines').delete().eq('batch_id', batch.id)
    await supabase.from('journal_lines').insert(lines)
  }

  return { imported: transactions.length, error: null }
}
