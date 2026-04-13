import { supabase } from './supabase'

export interface UserContext {
  profile: Record<string, unknown> | null
  clientAccount: Record<string, unknown> | null
  companies: Record<string, unknown>[]
  transactions: Record<string, unknown>[]
  journalEntries: Record<string, unknown>[]
  employees: Record<string, unknown>[]
  snapshots: Record<string, unknown>[]
  supportTickets: Record<string, unknown>[]
}

export async function loadUserContext(targetProfileId: string): Promise<UserContext> {
  if (!supabase) {
    return {
      profile: null, clientAccount: null, companies: [],
      transactions: [], journalEntries: [], employees: [],
      snapshots: [], supportTickets: [],
    }
  }

  // Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, language, subscription, llm_mode, full_name, created_at')
    .eq('id', targetProfileId)
    .single()

  // Client account (via owners table)
  const { data: ownerRow } = await supabase
    .from('owners')
    .select('client_account_id')
    .eq('profile_id', targetProfileId)
    .limit(1)
    .single()

  let clientAccount: Record<string, unknown> | null = null
  if (ownerRow?.client_account_id) {
    const { data } = await supabase
      .from('client_accounts')
      .select('*')
      .eq('id', ownerRow.client_account_id)
      .single()
    clientAccount = data
  }

  // Companies
  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .eq('profile_id', targetProfileId)

  const companyIds = (companies ?? []).map((c: Record<string, unknown>) => c.id as string)

  // Load data for all user's companies in parallel
  const [txRes, jeRes, empRes, snapRes, ticketRes] = await Promise.all([
    companyIds.length
      ? supabase.from('transactions').select('*').in('company_id', companyIds).order('date', { ascending: false }).limit(500)
      : Promise.resolve({ data: [] }),
    companyIds.length
      ? supabase.from('journal_batches').select('*, journal_lines(*)').in('company_id', companyIds).order('created_at', { ascending: false }).limit(200)
      : Promise.resolve({ data: [] }),
    companyIds.length
      ? supabase.from('employees').select('*').in('company_id', companyIds)
      : Promise.resolve({ data: [] }),
    supabase.from('data_snapshots').select('id, trigger_type, company_id, size_bytes, is_valid, created_at, restored_at').eq('profile_id', targetProfileId).order('created_at', { ascending: false }).limit(50),
    supabase.from('support_tickets').select('*').eq('profile_id', targetProfileId).order('created_at', { ascending: false }).limit(50),
  ])

  return {
    profile,
    clientAccount,
    companies: companies ?? [],
    transactions: txRes.data ?? [],
    journalEntries: jeRes.data ?? [],
    employees: empRes.data ?? [],
    snapshots: snapRes.data ?? [],
    supportTickets: ticketRes.data ?? [],
  }
}
