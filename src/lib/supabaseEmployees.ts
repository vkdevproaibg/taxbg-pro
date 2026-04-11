// src/lib/supabaseEmployees.ts
// Supabase CRUD for employees.
// Never imported directly in components — go through employeesStore.

import { supabase } from './supabase'
import type { Employee } from '../store/employeesStore'

// ── Type mapping ──────────────────────────────────────────────────────────────

function toSupabase(e: Employee, companyId: string) {
  return {
    id:              e.id,
    company_id:      companyId,
    full_name:       e.name,
    egn:             e.egn  || null,
    position:        e.position  || null,
    gross_salary:    e.grossSalary,
    start_date:      e.startDate || null,
    active:          e.active,
    employment_type: 'employee' as const,
  }
}

function fromSupabase(row: Record<string, unknown>): Employee {
  return {
    id:          row.id as string,
    name:        row.full_name as string,
    egn:         (row.egn as string) ?? '',
    position:    (row.position as string) ?? '',
    grossSalary: (row.gross_salary as number) ?? 0,
    startDate:   (row.start_date as string) ?? (row.hired_date as string) ?? '',
    active:      row.active as boolean,
    companyId:   row.company_id as string,
  }
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchEmployees(
  companyId: string
): Promise<Employee[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('company_id', companyId)
    .order('full_name', { ascending: true })

  if (error) {
    console.error('fetchEmployees error:', error)
    return []
  }

  return (data ?? []).map(fromSupabase)
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createEmployee(
  employee: Employee,
  companyId: string
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }

  const { error } = await supabase
    .from('employees')
    .insert(toSupabase(employee, companyId))

  return { error: error ? error.message : null }
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateEmployeeInSupabase(
  id: string,
  patch: Partial<Employee>
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }

  const updateData: Record<string, unknown> = {}
  if (patch.name        !== undefined) updateData.full_name    = patch.name
  if (patch.egn         !== undefined) updateData.egn          = patch.egn
  if (patch.position    !== undefined) updateData.position     = patch.position
  if (patch.grossSalary !== undefined) updateData.gross_salary = patch.grossSalary
  if (patch.startDate   !== undefined) updateData.start_date   = patch.startDate
  if (patch.active      !== undefined) updateData.active       = patch.active

  const { error } = await supabase
    .from('employees')
    .update(updateData)
    .eq('id', id)

  return { error: error ? error.message : null }
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteEmployeeFromSupabase(
  id: string
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }

  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id)

  return { error: error ? error.message : null }
}

// ── Import from localStorage (one-time migration) ─────────────────────────────

export async function importLocalEmployees(
  employees: Employee[],
  companyId: string
): Promise<{ imported: number; error: string | null }> {
  if (!supabase) return { imported: 0, error: 'Supabase not configured' }
  if (employees.length === 0) return { imported: 0, error: null }

  const rows = employees.map((e) => toSupabase(e, companyId))

  const { error } = await supabase
    .from('employees')
    .upsert(rows, { onConflict: 'id' })

  if (error) return { imported: 0, error: error.message }

  return { imported: employees.length, error: null }
}
