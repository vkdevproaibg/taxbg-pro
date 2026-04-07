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
}

interface EmployeesState {
  employees: Employee[]
  addEmployee: (e: Omit<Employee, 'id'>) => void
  updateEmployee: (id: string, patch: Partial<Employee>) => void
  removeEmployee: (id: string) => void
}

export const useEmployeesStore = create<EmployeesState>()(
  persist(
    (set) => ({
      employees: [],
      addEmployee: (e) =>
        set((s) => ({ employees: [...s.employees, { ...e, id: crypto.randomUUID() }] })),
      updateEmployee: (id, patch) =>
        set((s) => ({ employees: s.employees.map((e) => e.id === id ? { ...e, ...patch } : e) })),
      removeEmployee: (id) =>
        set((s) => ({ employees: s.employees.filter((e) => e.id !== id) })),
    }),
    { name: 'taxbg-employees' }
  )
)
