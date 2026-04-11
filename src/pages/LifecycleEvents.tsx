import { useState } from 'react'
import RegistrationTab   from '../modules/lifecycle/RegistrationTab'
import DocumentPackageTab from '../modules/lifecycle/DocumentPackageTab'
import ChangeFormTab     from '../modules/lifecycle/ChangeFormTab'
import SaleTab           from '../modules/lifecycle/SaleTab'
import ClosingTab        from '../modules/lifecycle/ClosingTab'
import BankruptcyTab     from '../modules/lifecycle/BankruptcyTab'

type LifecycleTab =
  'registration' | 'documents' | 'change_form' |
  'sale' | 'closing' | 'bankruptcy'

const TABS = [
  { id: 'registration' as LifecycleTab, label: '🏢 Регистрация' },
  { id: 'documents'    as LifecycleTab, label: '📁 Документи'   },
  { id: 'change_form'  as LifecycleTab, label: '🔄 Смена формы' },
  { id: 'sale'         as LifecycleTab, label: '💰 Продажа'     },
  { id: 'closing'      as LifecycleTab, label: '📦 Закрытие'    },
  { id: 'bankruptcy'   as LifecycleTab, label: '⚠️ Банкротство' },
]

export default function LifecycleEvents() {
  const [tab, setTab] = useState<LifecycleTab>('registration')

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 pt-4"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-card)' }}>
        <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Жизненный цикл компании
        </h1>
        <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
          Регистрация, развитие и корпоративные события
        </p>
        <div className="flex gap-1 overflow-x-auto pb-px">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="shrink-0 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors"
              style={{
                borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
                backgroundColor: 'transparent',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {tab === 'registration' && <RegistrationTab />}
        {tab === 'documents'    && <DocumentPackageTab />}
        {tab === 'change_form'  && <ChangeFormTab />}
        {tab === 'sale'        && <SaleTab />}
        {tab === 'closing'     && <ClosingTab />}
        {tab === 'bankruptcy'  && <BankruptcyTab />}
      </div>
    </div>
  )
}
