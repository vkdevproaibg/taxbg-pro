// src/lib/supabaseAdmin.ts
// Admin-only Supabase queries.
// These use the anon key with RLS — superadmin
// role in RLS policies allows access to all rows.

import { supabase } from './supabase'

export interface AdminUserSummary {
  profileId:         string
  role:              string
  subscription:      string
  language:          string
  createdAt:         string
}

export interface AdminStats {
  totalUsers:        number
  proUsers:          number
  freeUsers:         number
  totalCompanies:    number
  activeCompanies:   number
  totalTransactions: number
  recentAuditEvents: number  // last 24h
}

export async function fetchAdminStats(): Promise<AdminStats | null> {
  if (!supabase) return null

  const [
    { count: totalUsers },
    { count: proUsers },
    { count: totalCompanies },
    { count: activeCompanies },
    { count: totalTransactions },
    { count: recentAuditEvents },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true })
      .eq('subscription', 'pro'),
    supabase.from('companies').select('*', { count: 'exact', head: true }),
    supabase.from('companies').select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase.from('transactions').select('*', { count: 'exact', head: true }),
    supabase.from('audit_events').select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 86_400_000).toISOString()),
  ])

  return {
    totalUsers:        totalUsers        ?? 0,
    proUsers:          proUsers          ?? 0,
    freeUsers:         (totalUsers ?? 0) - (proUsers ?? 0),
    totalCompanies:    totalCompanies    ?? 0,
    activeCompanies:   activeCompanies   ?? 0,
    totalTransactions: totalTransactions ?? 0,
    recentAuditEvents: recentAuditEvents ?? 0,
  }
}

export async function fetchAllUsers(
  limit  = 50,
  offset = 0
): Promise<AdminUserSummary[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, subscription, language, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) { console.error('fetchAllUsers:', error); return [] }

  return (data ?? []).map(p => ({
    profileId:    p.id,
    role:         p.role,
    subscription: p.subscription,
    language:     p.language,
    createdAt:    p.created_at,
  }))
}

export interface AuditEvent {
  id:               string
  actor_profile_id: string | null
  entity_type:      string
  action:           string
  company_id:       string | null
  created_at:       string
  after_json:       unknown
}

export async function fetchAuditEvents(
  limit     = 100,
  companyId?: string,
  profileId?: string
): Promise<AuditEvent[]> {
  if (!supabase) return []

  let query = supabase
    .from('audit_events')
    .select('id, actor_profile_id, entity_type, action, company_id, created_at, after_json')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (companyId) query = query.eq('company_id', companyId)
  if (profileId) query = query.eq('actor_profile_id', profileId)

  const { data, error } = await query
  if (error) { console.error('fetchAuditEvents:', error); return [] }
  return (data ?? []) as AuditEvent[]
}

export async function adminFixTransaction(
  id:    string,
  patch: Record<string, unknown>
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }

  const { error } = await supabase
    .from('transactions')
    .update(patch)
    .eq('id', id)

  return { error: error?.message ?? null }
}
