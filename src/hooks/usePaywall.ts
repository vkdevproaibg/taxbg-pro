import { useAuthStore } from '../store/authStore'

export type PaywallReason =
  | 'add_transaction'
  | 'add_employee'
  | 'add_company'
  | 'export_data'
  | 'ai_assistant'
  | 'lesson_locked'

export function usePaywall() {
  const { profile, isDemo } = useAuthStore()

  const hasFullAccess = (): boolean => {
    if (isDemo) return false
    if (!profile) return false
    if (profile.role === 'superadmin') return true
    if (profile.role === 'superuser') return true
    if (profile.subscription === 'pro') return true
    return false
  }

  // Returns true if action is allowed, false if paywall should show
  const checkAccess = (_reason: PaywallReason): boolean => {
    if (isDemo) return false
    return hasFullAccess()
  }

  // First 3 lessons (index 0, 1, 2) are always free
  const canAccessLesson = (lessonIndex: number): boolean => {
    if (hasFullAccess()) return true
    return lessonIndex < 3
  }

  return {
    hasFullAccess: hasFullAccess(),
    checkAccess,
    canAccessLesson,
    isDemo,
  }
}
