import { useState } from 'react'
import { EXPAT_GUIDES, EXPAT_TABS } from '../constants/expat-guides'
import ExpatGuideView from '../modules/expat/ExpatGuideView'

export default function Expat() {
  const [activeId, setActiveId] = useState<string>(EXPAT_TABS[0].id)
  const active = EXPAT_GUIDES.find(g => g.id === activeId) ?? EXPAT_GUIDES[0]

  return (
    <div className="flex flex-col h-full">

      {/* Tab bar — horizontally scrollable for 9 tabs */}
      <div className="border-b"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-card)' }}>
        <div className="px-6 pt-4">
          <h1 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Жизнь в Болгарии
          </h1>
        </div>
        <div className="overflow-x-auto">
          <div className="flex gap-0.5 px-6 min-w-max">
            {EXPAT_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveId(tab.id)}
                className="px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors"
                style={{
                  borderBottom: activeId === tab.id
                    ? '2px solid var(--accent)'
                    : '2px solid transparent',
                  color: activeId === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                  backgroundColor: 'transparent',
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <ExpatGuideView guide={active} />
      </div>
    </div>
  )
}
