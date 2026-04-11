import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export function useCanEdit() {
  const navigate = useNavigate()
  const canEdit = useAuthStore((s) => s.canEdit())
  const isDemo = useAuthStore((s) => s.isDemo)

  const requireAuth = (callback: () => void) => {
    if (isDemo) {
      navigate('/auth')
      return
    }
    callback()
  }

  return { canEdit, requireAuth }
}
