import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import UnitTestTab from '../modules/testing/UnitTestTab'
import FullAuditReport from '../modules/testing/IntegrationTestRunner'

type Tab = 'audit' | 'unit'

const TAB_LABELS: Record<Tab, string> = {
  audit: 'Полная проверка',
  unit:  'Unit-тесты',
}

export default function Testing() {
  const { profile } = useAuthStore()
  const [tab, setTab] = useState<Tab>('audit')

  // Access guard — superadmin and superuser only
  const allowed = profile?.role === 'superadmin' || profile?.role === 'superuser'
  if (!allowed) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-5xl">🔒</p>
          <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Доступ ограничен
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Страница тестирования доступна только для superadmin и superuser.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-card)' }}>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Тестирование
        </h1>
        <div className="flex gap-4 mt-3">
          {(['audit', 'unit'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="text-sm pb-1 border-b-2 transition-colors"
              style={{
                borderColor: tab === t ? 'var(--accent)' : 'transparent',
                color: tab === t ? 'var(--accent-text)' : 'var(--text-muted)',
              }}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {tab === 'audit' && <FullAuditReport />}
        {tab === 'unit'  && <UnitTestTab />}
      </div>
    </div>
  )
}
