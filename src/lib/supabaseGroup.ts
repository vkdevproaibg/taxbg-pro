// src/lib/supabaseGroup.ts
// Supabase CRUD for company_relations (group structure).
// Never imported directly in components — go through groupStore.

import { supabase } from './supabase'
import type { CompanyRelation } from '../store/groupStore'

// ── Type mapping ──────────────────────────────────────────────────────────────

function toSupabase(r: CompanyRelation, clientAccountId: string) {
  return {
    id:                r.id,
    client_account_id: clientAccountId,
    from_company_id:   r.fromCompanyId,
    to_company_id:     r.toCompanyId,
    type:              r.type,
    ownership_pct:     r.ownershipPct ?? null,
    purpose:           r.purpose       ?? null,
    annual_flow:       r.annualFlow    ?? null,
    notes:             r.notes,
  }
}

function fromSupabase(row: Record<string, unknown>): CompanyRelation {
  return {
    id:            row.id as string,
    fromCompanyId: row.from_company_id as string,
    toCompanyId:   row.to_company_id   as string,
    type:          row.type as CompanyRelation['type'],
    ownershipPct:  (row.ownership_pct as number | null) ?? undefined,
    purpose:       (row.purpose       as string | null) ?? undefined,
    annualFlow:    (row.annual_flow   as number | null) ?? undefined,
    notes:         (row.notes as string) || '',
  }
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchRelations(
  clientAccountId: string
): Promise<CompanyRelation[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('company_relations')
    .select('*')
    .eq('client_account_id', clientAccountId)
    .order('created_at', { ascending: true })

  if (error) { console.error('fetchRelations:', error); return [] }
  return (data || []).map(fromSupabase)
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createRelation(
  r: CompanyRelation,
  clientAccountId: string
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }
  const { error } = await supabase
    .from('company_relations')
    .insert(toSupabase(r, clientAccountId))
  return { error: error ? error.message : null }
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateRelationInSupabase(
  id: string,
  patch: Partial<CompanyRelation>
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }

  const map: Record<string, unknown> = {}
  if (patch.type         !== undefined) map.type          = patch.type
  if (patch.ownershipPct !== undefined) map.ownership_pct = patch.ownershipPct
  if (patch.purpose      !== undefined) map.purpose       = patch.purpose
  if (patch.annualFlow   !== undefined) map.annual_flow   = patch.annualFlow
  if (patch.notes        !== undefined) map.notes         = patch.notes

  const { error } = await supabase
    .from('company_relations').update(map).eq('id', id)
  return { error: error ? error.message : null }
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteRelationFromSupabase(
  id: string
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }
  const { error } = await supabase
    .from('company_relations').delete().eq('id', id)
  return { error: error ? error.message : null }
}

// ── Import from localStorage (one-time migration) ─────────────────────────────

export async function importLocalRelations(
  relations: CompanyRelation[],
  clientAccountId: string
): Promise<{ imported: number; error: string | null }> {
  if (!supabase) return { imported: 0, error: 'Supabase not configured' }
  if (relations.length === 0) return { imported: 0, error: null }

  const rows = relations.map(r => toSupabase(r, clientAccountId))
  const { error } = await supabase
    .from('company_relations')
    .upsert(rows, { onConflict: 'id' })

  if (error) return { imported: 0, error: error.message }
  return { imported: relations.length, error: null }
}