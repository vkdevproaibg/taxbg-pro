import { useState } from 'react'
import TestRunnerTab from '../modules/testing/TestRunnerTab'
import UnitTestTab from '../modules/testing/UnitTestTab'
import IntegrationTestRunner from '../modules/testing/IntegrationTestRunner'

type Tab = 'scenarios' | 'unit' | 'integration'

const TAB_LABELS: Record<Tab, string> = {
  scenarios:   'Сценарии',
  unit:        'Unit Tests',
  integration: 'Интеграционный',
}

export default function Testing() {
  const [tab, setTab] = useState<Tab>('scenarios')

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-card)' }}>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          🧪 Тестирование
        </h1>
        <div className="flex gap-4 mt-3">
          {(['scenarios', 'unit', 'integration'] as Tab[]).map(t => (
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
        {tab === 'scenarios'   && <TestRunnerTab />}
        {tab === 'unit'        && <UnitTestTab />}
        {tab === 'integration' && <IntegrationTestRunner />}
      </div>
    </div>
  )
}
