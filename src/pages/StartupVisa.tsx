import { useState } from 'react'
import StartupOverviewTab from '../modules/startup-visa/StartupOverviewTab'
import StartupIsunTab     from '../modules/startup-visa/StartupIsunTab'
import StartupKepTab      from '../modules/startup-visa/StartupKepTab'
import StartupDocsTab     from '../modules/startup-visa/StartupDocsTab'
import StartupFormTab     from '../modules/startup-visa/StartupFormTab'

const TABS = [
  { id: 'overview', label: '📋 Обзор'         },
  { id: 'isun',     label: '🖥 Подача в ISUN' },
  { id: 'kep',      label: '🔏 КЕП'           },
  { id: 'docs',     label: '📁 Документы'     },
  { id: 'form',     label: '📝 Анкета визы D' },
] as const

type TabId = typeof TABS[number]['id']

export default function StartupVisa() {
  const [tab, setTab] = useState<TabId>('overview')
  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 pt-4"
        style={{ borderColor: 'var(--border)',
                 backgroundColor: 'var(--surface-card)' }}>
        <h1 className="text-xl font-semibold mb-1"
          style={{ color: 'var(--text-primary)' }}>
          🚀 Виза D — Startup Visa Болгарии
        </h1>
        <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
          Инновационный проект → сертификат МИР → виза D → ВНЖ
        </p>
        <div className="flex gap-1 overflow-x-auto pb-px -mx-1 px-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="shrink-0 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors"
              style={{
                borderBottom: tab === t.id
                  ? '2px solid var(--accent)'
                  : '2px solid transparent',
                color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
                backgroundColor: 'transparent',
                whiteSpace: 'nowrap',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {tab === 'overview' && <StartupOverviewTab />}
        {tab === 'isun'     && <StartupIsunTab />}
        {tab === 'kep'      && <StartupKepTab />}
        {tab === 'docs'     && <StartupDocsTab />}
        {tab === 'form'     && <StartupFormTab />}
      </div>
    </div>
  )
}
