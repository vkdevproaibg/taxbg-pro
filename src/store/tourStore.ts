import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface TourStep {
  id: string
  navigateTo?: string
  title: string
  instruction: string
  highlightTarget?: string | null
  // Tab to activate on the target page after navigation
  activateTab?: string
  completionTrigger: 'manual' | `navigate:${string}` | `action:${string}`
  sandboxSetup?: () => void
  affectsSystem?: string[]
  completionNote?: string
}

export interface Tour {
  id: string
  title: string
  subtitle: string
  icon: string
  durationMin: number
  steps: TourStep[]
  sandboxInit?: string
}

export interface TourSession {
  tourId: string
  currentStepIndex: number
  completedSteps: string[]
  startedAt: string
  completedAt?: string
  sandboxTransactionIds: string[]
  sandboxCompanyId?: string
  sandboxEmployeeIds: string[]
  isSandbox: boolean
}

interface TourState {
  activeTour: Tour | null
  session: TourSession | null
  completedTours: string[]
  isOverlayMinimized: boolean

  startTour: (tour: Tour, sandbox?: boolean) => void
  nextStep: () => void
  prevStep: () => void
  completeStep: (stepId: string) => void
  endTour: (completed?: boolean) => void
  minimizeOverlay: (v: boolean) => void
  isStepComplete: (stepId: string) => boolean
  getCurrentStep: () => TourStep | null
}

export const useTourStore = create<TourState>()(
  persist(
    (set, get) => ({
      activeTour: null,
      session: null,
      completedTours: [],
      isOverlayMinimized: false,

      startTour: (tour, sandbox = true) => {
        set({
          activeTour: tour,
          isOverlayMinimized: false,
          session: {
            tourId: tour.id,
            currentStepIndex: 0,
            completedSteps: [],
            startedAt: new Date().toISOString(),
            sandboxTransactionIds: [],
            sandboxEmployeeIds: [],
            isSandbox: sandbox,
          },
        })
      },

      nextStep: () => {
        const { session, activeTour } = get()
        if (!session || !activeTour) return
        const nextIdx = Math.min(
          session.currentStepIndex + 1,
          activeTour.steps.length - 1
        )
        set({ session: { ...session, currentStepIndex: nextIdx } })
      },

      prevStep: () => {
        const { session } = get()
        if (!session) return
        set({
          session: {
            ...session,
            currentStepIndex: Math.max(0, session.currentStepIndex - 1),
          },
        })
      },

      completeStep: (stepId) => {
        const { session } = get()
        if (!session) return
        if (!session.completedSteps.includes(stepId)) {
          set({
            session: {
              ...session,
              completedSteps: [...session.completedSteps, stepId],
            },
          })
        }
      },

      endTour: (completed = false) => {
        const { session, completedTours } = get()
        if (completed && session) {
          set({
            completedTours: [...completedTours, session.tourId],
          })
        }
        set({ activeTour: null, session: null })
      },

      minimizeOverlay: (v) => set({ isOverlayMinimized: v }),

      isStepComplete: (stepId) => {
        const { session } = get()
        return session?.completedSteps.includes(stepId) ?? false
      },

      getCurrentStep: () => {
        const { activeTour, session } = get()
        if (!activeTour || !session) return null
        return activeTour.steps[session.currentStepIndex] ?? null
      },
    }),
    { name: 'taxbg-tour-store' }
  )
)
