import { useState } from 'react'
import TestRunnerTab from '../modules/testing/TestRunnerTab'
import UnitTestTab from '../modules/testing/UnitTestTab'

type Tab = 'scenarios' | 'unit'

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
          {(['scenarios', 'unit'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="text-sm pb-1 border-b-2 transition-colors"
              style={{
                borderColor: tab === t ? 'var(--accent)' : 'transparent',
                color: tab === t ? 'var(--accent-text)' : 'var(--text-muted)',
              }}
            >
              {t === 'scenarios' ? 'Сценарии' : 'Unit Tests'}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {tab === 'scenarios' ? <TestRunnerTab /> : <UnitTestTab />}
      </div>
    </div>
  )
}
