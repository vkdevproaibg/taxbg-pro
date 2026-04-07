import { create } from 'zustand'

interface CalculatorState {
  income: number
  setIncome: (income: number) => void
}

export const useCalculatorStore = create<CalculatorState>((set) => ({
  income: 0,
  setIncome: (income) => set({ income }),
}))
