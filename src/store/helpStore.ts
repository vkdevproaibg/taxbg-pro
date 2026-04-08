import { create } from 'zustand'

export interface HelpContext {
  topic: string          // e.g. 'ЗКПО чл. 204' or 'vehicle_expense' or 'DDS registration'
  title?: string         // optional display title
  pageContext?: string   // e.g. 'accounting' - hints which page triggered it
}

interface HelpState {
  open: boolean
  context: HelpContext | null
  openHelp: (ctx: HelpContext) => void
  closeHelp: () => void
}

export const useHelpStore = create<HelpState>((set) => ({
  open: false,
  context: null,
  openHelp: (context) => set({ open: true, context }),
  closeHelp: () => set({ open: false, context: null }),
}))
