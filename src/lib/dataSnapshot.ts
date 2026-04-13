import { supabase } from './supabase'
import { buildBalanceSheet, buildOPR } from './financialReports'

interface SnapshotOpts {
  profileId: string
  clientAccountId?: string | null
  companyId: string
  triggerType: 'daily_auto' | 'pre_fix' | 'manual' | 'pre_purge'
}

interface SnapshotRecord {
  id: string
  profile_id: string
  client_account_id: string | null
  company_id: string | null
  trigger_type: string
  snapshot_data: unknown
  size_bytes: number | null
  is_valid: boolean
  restored_at: string | null
  restored_by: string | null
  expires_at: string | null
  created_at: string
}

const EXPIRY_DAYS: Record<string, number | null> = {
  daily_auto: 7,
  pre_fix: 30,
  manual: 90,
  pre_purge: null, // never expires
}

export async function createSnapshot(opts: SnapshotOpts): Promise<string | null> {
  if (!supabase) return null

  const { profileId, clientAccountId, companyId, triggerType } = opts

  // Load all company data
  const [txRes, jbRes, jlRes, empRes] = await Promise.all([
    supabase.from('transactions').select('*').eq('company_id', companyId),
    supabase.from('journal_batches').select('*').eq('company_id', companyId),
    supabase.from('journal_lines').select('*, journal_batches!inner(company_id)').eq('journal_batches.company_id', companyId),
    supabase.from('employees').select('*').eq('company_id', companyId),
  ])

  const transactions = txRes.data ?? []
  const journalBatches = jbRes.data ?? []
  const journalLines = jlRes.data ?? []
  const employees = empRes.data ?? []

  // Build reports for reference
  let balanceSheet = null
  let oprReport = null
  try {
    // Convert journal_lines to JournalEntry-like format for reports
    const entries = journalLines.map((jl: Record<string, unknown>) => ({
      id: jl.id as string,
      date: (jl.created_at as string)?.slice(0, 10) ?? '',
      description: (jl.description as string) ?? '',
      debitAccount: (jl.debit_account as string) ?? '',
      creditAccount: (jl.credit_account as string) ?? '',
      amount: Number(jl.amount) || 0,
      period: (jl.created_at as string)?.slice(0, 7) ?? '',
      source: 'auto' as const,
    }))
    const yearEnd = new Date().toISOString().slice(0, 4) + '-12-31'
    const yearStart = new Date().toISOString().slice(0, 4) + '-01-01'
    balanceSheet = buildBalanceSheet(entries, yearEnd, '')
    oprReport = buildOPR(entries, transactions, yearStart, yearEnd, '')
  } catch { /* non-fatal */ }

  const snapshotData = {
    transactions,
    journalBatches,
    journalLines,
    employees,
    balanceSheet,
    oprReport,
    capturedAt: new Date().toISOString(),
  }

  const jsonStr = JSON.stringify(snapshotData)
  const sizeBytes = new Blob([jsonStr]).size

  const expiryDays = EXPIRY_DAYS[triggerType]
  const expiresAt = expiryDays
    ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
    : null

  const { data, error } = await supabase.from('data_snapshots').insert({
    profile_id: profileId,
    client_account_id: clientAccountId ?? null,
    company_id: companyId,
    trigger_type: triggerType,
    snapshot_data: snapshotData,
    size_bytes: sizeBytes,
    expires_at: expiresAt,
  }).select('id').single()

  if (error) {
    console.error('[dataSnapshot] create failed:', error)
    return null
  }

  return data.id
}

export async function restoreSnapshot(
  snapshotId: string,
  restoredBy: string,
): Promise<boolean> {
  if (!supabase) return false

  // Load snapshot
  const { data: snap, error: snapErr } = await supabase
    .from('data_snapshots')
    .select('*')
    .eq('id', snapshotId)
    .single()

  if (snapErr || !snap) {
    console.error('[dataSnapshot] load failed:', snapErr)
    return false
  }

  const companyId = snap.company_id
  const snapshotData = snap.snapshot_data as {
    transactions: Record<string, unknown>[]
    journalBatches: Record<string, unknown>[]
    journalLines: Record<string, unknown>[]
    employees: Record<string, unknown>[]
  }

  // Create pre_fix snapshot of current data before restoring
  await createSnapshot({
    profileId: restoredBy,
    clientAccountId: snap.client_account_id,
    companyId,
    triggerType: 'pre_fix',
  })

  // Delete current data
  await Promise.all([
    supabase.from('journal_lines')
      .delete()
      .in('batch_id', (
        await supabase.from('journal_batches').select('id').eq('company_id', companyId)
      ).data?.map((b: { id: string }) => b.id) ?? []),
    supabase.from('transactions').delete().eq('company_id', companyId),
    supabase.from('employees').delete().eq('company_id', companyId),
  ])

  // Delete journal batches after lines
  await supabase.from('journal_batches').delete().eq('company_id', companyId)

  // Insert restored data
  if (snapshotData.transactions?.length) {
    await supabase.from('transactions').insert(snapshotData.transactions)
  }
  if (snapshotData.journalBatches?.length) {
    await supabase.from('journal_batches').insert(snapshotData.journalBatches)
  }
  if (snapshotData.journalLines?.length) {
    await supabase.from('journal_lines').insert(snapshotData.journalLines)
  }
  if (snapshotData.employees?.length) {
    await supabase.from('employees').insert(snapshotData.employees)
  }

  // Mark snapshot as restored
  await supabase.from('data_snapshots').update({
    restored_at: new Date().toISOString(),
    restored_by: restoredBy,
  }).eq('id', snapshotId)

  // Audit event
  await supabase.from('audit_events').insert({
    actor_profile_id: restoredBy,
    company_id: companyId,
    entity_type: 'data_snapshot',
    entity_id: snapshotId,
    action: 'restored',
    after_json: { snapshot_id: snapshotId, trigger_type: snap.trigger_type },
  })

  return true
}

export async function getSnapshots(companyId: string): Promise<SnapshotRecord[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('data_snapshots')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_valid', true)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[dataSnapshot] getSnapshots failed:', error)
    return []
  }

  return data as SnapshotRecord[]
}

export async function createDailySnapshotIfNeeded(
  profileId: string,
  clientAccountId: string | null,
  companyId: string,
): Promise<void> {
  if (!supabase) return

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // Check if we already have a daily snapshot today
  const { data: existing } = await supabase
    .from('data_snapshots')
    .select('id')
    .eq('company_id', companyId)
    .eq('trigger_type', 'daily_auto')
    .gte('created_at', todayStart.toISOString())
    .limit(1)

  if (existing && existing.length > 0) return

  // Create daily snapshot
  await createSnapshot({
    profileId,
    clientAccountId,
    companyId,
    triggerType: 'daily_auto',
  })

  // Cleanup: keep max 3 daily_auto snapshots, invalidate old ones
  const { data: allDaily } = await supabase
    .from('data_snapshots')
    .select('id, created_at')
    .eq('company_id', companyId)
    .eq('trigger_type', 'daily_auto')
    .eq('is_valid', true)
    .order('created_at', { ascending: false })

  if (allDaily && allDaily.length > 3) {
    const toInvalidate = allDaily.slice(3).map(s => s.id)
    await supabase
      .from('data_snapshots')
      .update({ is_valid: false })
      .in('id', toInvalidate)
  }
}

export async function executeWithSafety<T>(opts: {
  profileId: string
  clientAccountId?: string | null
  companyId: string
  actionName: string
  action: () => Promise<T>
}): Promise<T> {
  const { profileId, clientAccountId, companyId, actionName, action } = opts

  // Create pre_fix snapshot
  const snapshotId = await createSnapshot({
    profileId,
    clientAccountId: clientAccountId ?? null,
    companyId,
    triggerType: 'pre_fix',
  })

  try {
    const result = await action()

    // Log success
    if (supabase) {
      await supabase.from('audit_events').insert({
        actor_profile_id: profileId,
        company_id: companyId,
        entity_type: 'safe_action',
        action: actionName,
        after_json: { success: true, snapshot_id: snapshotId },
      })
    }

    return result
  } catch (err) {
    console.error(`[executeWithSafety] ${actionName} failed, restoring:`, err)

    // Auto-restore on failure
    if (snapshotId) {
      await restoreSnapshot(snapshotId, profileId)
    }

    throw err
  }
}
