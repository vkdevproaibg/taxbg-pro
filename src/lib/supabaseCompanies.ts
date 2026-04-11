// src/lib/supabaseCompanies.ts
// All Supabase CRUD operations for companies
// Called by companiesStore when user is authenticated

import { supabase } from './supabase'
import type { Company } from '../store/companiesStore'

// ── Type mapping ──────────────────────────────────────────

function toSupabase(c: Company, clientAccountId: string) {
  return {
    id:                c.id,
    client_account_id: clientAccountId,
    name:              c.name,
    eik:               c.eik || null,
    legal_form:        c.legalForm,
    has_vat:           c.hasVat,
    has_employees:     c.hasEmployees,
    currency:          c.currency,
    tax_residency:     c.taxResidency,
    is_offshore:       c.isOffshore,
    notes:             c.notes,
    color:             c.color,
    status:            'active' as const,
    capital_eur:       1.00,
    created_at:        c.createdAt,
  }
}

function fromSupabase(row: Record<string, unknown>): Company {
  return {
    id:           row.id as string,
    name:         row.name as string,
    eik:          (row.eik as string) || '',
    legalForm:    row.legal_form as 'ood' | 'et' | 'self',
    hasVat:       row.has_vat as boolean,
    hasEmployees: row.has_employees as boolean,
    country:      'BG',
    currency:     (row.currency as string) || 'EUR',
    taxResidency: (row.tax_residency as string) || 'BG',
    isOffshore:   row.is_offshore as boolean,
    notes:        (row.notes as string) || '',
    createdAt:    row.created_at as string,
    color:        (row.color as string) || '#00966E',
  }
}

// ── Client Account ────────────────────────────────────────

export async function getClientAccountId(
  profileId: string
): Promise<{ id: string; migrationDone: boolean } | null> {
  if (!supabase) return null

  // Find owner linked to this profile
  const { data: owner } = await supabase
    .from('owners')
    .select('id')
    .eq('linked_profile_id', profileId)
    .single()

  if (!owner) return null

  // Find client account for this owner
  const { data: account } = await supabase
    .from('client_accounts')
    .select('id, migration_completed_at')
    .eq('owner_id', owner.id)
    .single()

  if (!account) return null

  return {
    id: account.id,
    migrationDone: !!account.migration_completed_at,
  }
}

export async function ensureClientAccount(
  ownerProfileId: string
): Promise<string | null> {
  if (!supabase) return null

  // Check if already exists (handles race conditions)
  const existing = await getClientAccountId(ownerProfileId)
  if (existing) return existing.id

  // Create owner record first
  const { data: owner, error: ownerError } = await supabase
    .from('owners')
    .insert({
      linked_profile_id: ownerProfileId,
      full_name: 'Владелец',
      country: 'BG',
      created_by: ownerProfileId,
    })
    .select('id')
    .single()

  if (ownerError || !owner) {
    console.error('Failed to create owner:', ownerError)
    return null
  }

  // Create client account
  const { data: account, error: accountError } = await supabase
    .from('client_accounts')
    .insert({
      owner_id: owner.id,
      status: 'pending',
    })
    .select('id')
    .single()

  if (accountError || !account) {
    console.error('Failed to create client account:', accountError)
    return null
  }

  // Add owner as account member
  await supabase
    .from('client_account_members')
    .insert({
      client_account_id: account.id,
      profile_id: ownerProfileId,
      role: 'owner',
      status: 'active',
    })

  return account.id
}

export async function markMigrationComplete(
  clientAccountId: string
): Promise<void> {
  if (!supabase) return
  await supabase
    .from('client_accounts')
    .update({ migration_completed_at: new Date().toISOString() })
    .eq('id', clientAccountId)
}

// ── Companies CRUD ────────────────────────────────────────

export async function fetchCompanies(
  clientAccountId: string
): Promise<Company[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('client_account_id', clientAccountId)
    .neq('status', 'closed')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('fetchCompanies error:', error)
    return []
  }

  return (data || []).map(fromSupabase)
}

export async function createCompany(
  company: Company,
  clientAccountId: string
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }

  const { error } = await supabase
    .from('companies')
    .insert(toSupabase(company, clientAccountId))

  if (error) {
    console.error('createCompany error:', error)
    return { error: error.message }
  }

  // Activate client account if it was pending
  await supabase
    .from('client_accounts')
    .update({ status: 'active' })
    .eq('id', clientAccountId)
    .eq('status', 'pending')

  return { error: null }
}

export async function updateCompany(
  id: string,
  patch: Partial<Company>,
  clientAccountId: string
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }

  const updateData: Record<string, unknown> = {}
  if (patch.name !== undefined)         updateData.name = patch.name
  if (patch.eik !== undefined)          updateData.eik = patch.eik
  if (patch.legalForm !== undefined)    updateData.legal_form = patch.legalForm
  if (patch.hasVat !== undefined)       updateData.has_vat = patch.hasVat
  if (patch.hasEmployees !== undefined) updateData.has_employees = patch.hasEmployees
  if (patch.currency !== undefined)     updateData.currency = patch.currency
  if (patch.taxResidency !== undefined) updateData.tax_residency = patch.taxResidency
  if (patch.isOffshore !== undefined)   updateData.is_offshore = patch.isOffshore
  if (patch.notes !== undefined)        updateData.notes = patch.notes
  if (patch.color !== undefined)        updateData.color = patch.color

  const { error } = await supabase
    .from('companies')
    .update(updateData)
    .eq('id', id)
    .eq('client_account_id', clientAccountId)

  return { error: error ? error.message : null }
}

export async function deleteCompany(
  id: string
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }

  // Soft delete — set status to closed
  const { error } = await supabase
    .from('companies')
    .update({ status: 'closed' })
    .eq('id', id)

  return { error: error ? error.message : null }
}

// ── Import from localStorage (one-time migration) ─────────

export async function importLocalCompanies(
  localCompanies: Company[],
  clientAccountId: string
): Promise<{ imported: number; error: string | null }> {
  if (!supabase) return { imported: 0, error: 'Supabase not configured' }
  if (localCompanies.length === 0) return { imported: 0, error: null }

  const rows = localCompanies.map(c => toSupabase(c, clientAccountId))

  const { error } = await supabase
    .from('companies')
    .upsert(rows, { onConflict: 'id' })

  if (error) {
    console.error('importLocalCompanies error:', error)
    return { imported: 0, error: error.message }
  }

  // Activate client account
  await supabase
    .from('client_accounts')
    .update({ status: 'active' })
    .eq('id', clientAccountId)
    .eq('status', 'pending')

  return { imported: localCompanies.length, error: null }
}
