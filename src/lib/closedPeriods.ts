import { supabase } from './supabase'

export interface ClosedPeriod {
  id: string
  companyId: string
  periodYear: number
  periodMonth: number | null
  closedBy: string
  closedAt: string
  notes: string | null
}

// Check if a specific date falls in a closed period
export async function isDateInClosedPeriod(
  companyId: string,
  date: string  // 'YYYY-MM-DD'
): Promise<boolean> {
  if (!supabase) return false

  const year  = parseInt(date.substring(0, 4))
  const month = parseInt(date.substring(5, 7))

  const { data } = await supabase
    .from('closed_periods')
    .select('id')
    .eq('company_id', companyId)
    .or(
      // Whole year closed
      `and(period_year.eq.${year},period_month.is.null),` +
      // Specific month closed
      `and(period_year.eq.${year},period_month.eq.${month})`
    )
    .limit(1)

  return (data?.length ?? 0) > 0
}

// Get all closed periods for a company
export async function fetchClosedPeriods(
  companyId: string
): Promise<ClosedPeriod[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('closed_periods')
    .select('*')
    .eq('company_id', companyId)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })

  if (error) { console.error('fetchClosedPeriods:', error); return [] }

  return (data || []).map(r => ({
    id:          r.id,
    companyId:   r.company_id,
    periodYear:  r.period_year,
    periodMonth: r.period_month,
    closedBy:    r.closed_by,
    closedAt:    r.closed_at,
    notes:       r.notes,
  }))
}

// Close a period
export async function closePeriod(
  companyId: string,
  year: number,
  month: number | null,
  profileId: string,
  notes?: string
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }

  const { error } = await supabase
    .from('closed_periods')
    .insert({
      company_id:   companyId,
      period_year:  year,
      period_month: month,
      closed_by:    profileId,
      notes:        notes ?? null,
    })

  return { error: error ? error.message : null }
}

// Reopen a period (only superadmin/accountant)
export async function reopenPeriod(
  id: string
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }

  const { error } = await supabase
    .from('closed_periods')
    .delete()
    .eq('id', id)

  return { error: error ? error.message : null }
}
