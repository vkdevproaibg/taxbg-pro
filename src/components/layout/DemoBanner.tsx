import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function DemoBanner() {
  const { isDemo } = useAuthStore()
  const navigate = useNavigate()

  if (!isDemo) return null

  return (
    <div className="flex items-center justify-between px-4 py-2 shrink-0"
      style={{ backgroundColor: '#f59e0b20',
               borderBottom: '1px solid #f59e0b40' }}>
      <p className="text-xs" style={{ color: '#92400e' }}>
        🔒 Демо-режим — данные хранятся только в браузере.
        Войдите для сохранения на сервере.
      </p>
      <button
        onClick={() => navigate('/auth')}
        className="rounded-lg px-3 py-1 text-xs font-medium shrink-0 ml-3"
        style={{ backgroundColor: '#f59e0b', color: 'white' }}>
        Войти
      </button>
    </div>
  )
}
