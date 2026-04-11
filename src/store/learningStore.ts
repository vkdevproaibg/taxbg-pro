import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { ALL_LESSONS } from '../constants/lessons'

interface LearningState {
  completedLessons: string[]   // lesson ids
  currentLessonId: string | null
  currentStepIndex: number
  isSynced: boolean

  markComplete:     (lessonId: string) => void
  setCurrentLesson: (lessonId: string | null) => void
  setCurrentStep:   (index: number) => void
  isCompleted:      (lessonId: string) => boolean
  getProgress:      () => { completed: number; total: number; pct: number }
  initFromSupabase: (profileId: string) => Promise<void>
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      completedLessons: [],
      currentLessonId:  null,
      currentStepIndex: 0,
      isSynced:         false,

      markComplete: (lessonId) => {
        set(s => ({
          completedLessons: s.completedLessons.includes(lessonId)
            ? s.completedLessons
            : [...s.completedLessons, lessonId],
        }))

        if (get().isSynced) {
          import('./authStore').then(({ useAuthStore }) => {
            const userId = useAuthStore.getState().user?.id
            if (!userId || !supabase) return
            supabase
              .from('profiles')
              .update({
                completed_lessons:   get().completedLessons,
                learning_updated_at: new Date().toISOString(),
              })
              .eq('id', userId)
              .then(({ error }) => {
                if (error) console.error('Sync markComplete:', error)
              })
          })
        }
      },

      setCurrentLesson: (lessonId) =>
        set({ currentLessonId: lessonId, currentStepIndex: 0 }),

      setCurrentStep: (index) => set({ currentStepIndex: index }),

      isCompleted: (lessonId) =>
        get().completedLessons.includes(lessonId),

      getProgress: () => {
        const { completedLessons } = get()
        const total     = ALL_LESSONS.length
        const completed = completedLessons.length
        return { completed, total, pct: total > 0 ? Math.round(completed / total * 100) : 0 }
      },

      initFromSupabase: async (profileId) => {
        if (!supabase) { set({ isSynced: true }); return }

        const { data, error } = await supabase
          .from('profiles')
          .select('completed_lessons')
          .eq('id', profileId)
          .single()

        if (!error && data) {
          const serverLessons = (data.completed_lessons as string[]) || []

          if (serverLessons.length > 0) {
            set({ completedLessons: serverLessons, isSynced: true })
          } else {
            const local = get().completedLessons
            if (local.length > 0) {
              await supabase
                .from('profiles')
                .update({
                  completed_lessons:   local,
                  learning_updated_at: new Date().toISOString(),
                })
                .eq('id', profileId)
            }
            set({ isSynced: true })
          }
        } else {
          set({ isSynced: true })
        }
      },
    }),
    { name: 'taxbg-learning' }
  )
)
