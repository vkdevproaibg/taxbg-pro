import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Employee {
  id: string
  name: string
  egn: string
  position: string
  grossSalary: number
  startDate: string
  active: boolean
  companyId?: string
}

interface EmployeesState {
  employees: Employee[]
  isSynced: boolean

  initFromSupabase: (companyId: string) => Promise<void>
  addEmployee:    (e: Omit<Employee, 'id'>) => void
  updateEmployee: (id: string, patch: Partial<Employee>) => void
  removeEmployee: (id: string) => void
}

export const useEmployeesStore = create<EmployeesState>()(
  persist(
    (set, get) => ({
      employees: [],
      isSynced: false,

      initFromSupabase: async (companyId: string) => {
        const {
          fetchEmployees,
          importLocalEmployees,
        } = await import('../lib/supabaseEmployees')

        // Check if server already has employees for this company
        const serverEmployees = await fetchEmployees(companyId)

        if (serverEmployees.length === 0) {
          // No server data — import from localStorage
          const localEmployees = get().employees.filter(
            (e) => e.companyId === companyId || !e.companyId
          )

          if (localEmployees.length > 0) {
            const { error } = await importLocalEmployees(
              localEmployees,
              companyId
            )
            if (error) {
              console.error('Employees import error:', error)
              set({ isSynced: true })
              return
            }
          }

          // Reload from server (or set empty if no local data either)
          const imported = await fetchEmployees(companyId)
          set({ employees: imported, isSynced: true })
        } else {
          // Server has data — use it as source of truth
          set({ employees: serverEmployees, isSynced: true })
        }
      },

      addEmployee: (e) => {
        const id = crypto.randomUUID()
        const newEmployee: Employee = { ...e, id }

        // Optimistic local update
        set((s) => ({ employees: [...s.employees, newEmployee] }))

        // Sync to Supabase if authenticated
        const companyId = newEmployee.companyId
        if (companyId && get().isSynced) {
          import('../lib/supabaseEmployees').then(({ createEmployee }) => {
            createEmployee(newEmployee, companyId).then(({ error }) => {
              if (error) console.error('Sync addEmployee error:', error)
            })
          })
        }
      },

      updateEmployee: (id, patch) => {
        set((s) => ({
          employees: s.employees.map((e) =>
            e.id === id ? { ...e, ...patch } : e
          ),
        }))

        if (get().isSynced) {
          import('../lib/supabaseEmployees').then(
            ({ updateEmployeeInSupabase }) => {
              updateEmployeeInSupabase(id, patch).then(({ error }) => {
                if (error) console.error('Sync updateEmployee error:', error)
              })
            }
          )
        }
      },

      removeEmployee: (id) => {
        set((s) => ({
          employees: s.employees.filter((e) => e.id !== id),
        }))

        if (get().isSynced) {
          import('../lib/supabaseEmployees').then(
            ({ deleteEmployeeFromSupabase }) => {
              deleteEmployeeFromSupabase(id).then(({ error }) => {
                if (error) console.error('Sync removeEmployee error:', error)
              })
            }
          )
        }
      },
    }),
    { name: 'taxbg-employees' }
  )
)
