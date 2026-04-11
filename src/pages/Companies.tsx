import { useState } from 'react'
import { useCompaniesStore } from '../store/companiesStore'
import { useGroupStore, RELATION_LABELS, COUNTRY_OPTIONS } from '../store/groupStore'
import type { Company } from '../store/companiesStore'
import type { RelationType } from '../store/groupStore'
import HelpButton from '../components/ui/HelpButton'
import GroupOptimizer from '../modules/companies/GroupOptimizer'
import { ensureCapitalEntry } from '../lib/journalAI'
import { useAuthStore } from '../store/authStore'
import { usePaywall } from '../hooks/usePaywall'
import PaywallModal from '../components/ui/PaywallModal'

type CompaniesTab = 'companies' | 'optimizer'

const LEGAL_FORM_OPTIONS = [
  { value: 'ood',  label: 'ООД / ЕООД (Болгария)' },
  { value: 'et',   label: 'ЕТ (Болгария)' },
  { value: 'self', label: 'Самоосигуряващ (Болгария)' },
]

const COMPANY_COLORS = [
  '#00966E', '#D62612', '#3b82f6', '#8b5cf6',
  '#f59e0b', '#10b981', '#ef4444', '#6366f1',
]

function CompanyCard({
  company,
  isActive,
  onActivate,
  onEdit,
  onDelete,
}: {
  company: Company
  isActive: boolean
  onActivate: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const countryLabel = COUNTRY_OPTIONS.find(c => c.code === company.country)?.label ?? company.country

  return (
    <div className="rounded-xl shadow-sm overflow-hidden"
      style={{
        border: isActive
          ? `2px solid ${company.color}`
          : '1px solid var(--border)',
        backgroundColor: 'var(--surface-card)',
      }}>

      {/* Color header */}
      <div className="h-1.5" style={{ backgroundColor: company.color }} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: company.color }} />
              <h3 className="font-semibold text-sm truncate"
                style={{ color: 'var(--text-primary)' }}>
                {company.name}
              </h3>
              {isActive && (
                <span className="rounded-full px-2 py-0.5 text-xs font-medium shrink-0"
                  style={{ backgroundColor: company.color + '20', color: company.color }}>
                  Активна
                </span>
              )}
              {company.isOffshore && (
                <span className="rounded-full px-2 py-0.5 text-xs font-medium shrink-0 bg-amber-50 text-amber-700">
                  Offshore
                </span>
              )}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {company.legalForm.toUpperCase()} · ЕИК: {company.eik || '—'} · {countryLabel.split('—')[0].trim()}
            </p>
            {company.notes && (
              <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                {company.notes}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          {!isActive && (
            <button onClick={onActivate}
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                backgroundColor: company.color,
                color: '#fff',
              }}>
              Выбрать
            </button>
          )}
          <button onClick={onEdit}
            className="rounded-lg px-3 py-1.5 text-xs transition-colors"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--surface)',
            }}>
            Редактировать
          </button>
          <button onClick={onDelete}
            className="rounded-lg px-3 py-1.5 text-xs transition-colors ml-auto"
            style={{ color: 'var(--danger)' }}>
            Удалить
          </button>
        </div>
      </div>
    </div>
  )
}

function CompanyForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Company>
  onSave: (data: Omit<Company, 'id' | 'createdAt'>) => void
  onCancel: () => void
}) {
  const [name,       setName]       = useState(initial?.name        ?? '')
  const [eik,        setEik]        = useState(initial?.eik          ?? '')
  const [legalForm,  setLegalForm]  = useState(initial?.legalForm    ?? 'ood')
  const [country,    setCountry]    = useState(initial?.country      ?? 'BG')
  const [currency,   setCurrency]   = useState(initial?.currency     ?? 'EUR')
  const [taxRes,     setTaxRes]     = useState(initial?.taxResidency ?? 'BG')
  const [hasVat,     setHasVat]     = useState(initial?.hasVat       ?? false)
  const [hasEmp,     setHasEmp]     = useState(initial?.hasEmployees ?? false)
  const [isOffshore, setIsOffshore] = useState(initial?.isOffshore   ?? false)
  const [notes,      setNotes]      = useState(initial?.notes        ?? '')
  const [color,      setColor]      = useState(initial?.color        ?? '#00966E')

  const inputStyle = {
    border: '1.5px solid var(--border)',
    backgroundColor: 'var(--surface)',
    color: 'var(--text-primary)',
    borderRadius: 12,
    padding: '8px 12px',
    fontSize: 13,
    width: '100%',
    outline: 'none',
  }

  return (
    <div className="rounded-xl p-5 space-y-4"
      style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>

      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
        {initial?.name ? 'Редактировать компанию' : 'Новая компания'}
      </h3>

      {/* Color picker */}
      <div>
        <label className="mb-2 block text-xs" style={{ color: 'var(--text-secondary)' }}>
          Цвет
        </label>
        <div className="flex gap-2">
          {COMPANY_COLORS.map((c) => (
            <button key={c}
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                outline: color === c ? `3px solid ${c}` : 'none',
                outlineOffset: 2,
              }} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
            Название компании *
          </label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Acme ЕООД" style={inputStyle}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
        </div>

        <div>
          <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
            ЕИК / Рег. номер
          </label>
          <input value={eik} onChange={(e) => setEik(e.target.value)}
            placeholder="123456789" style={inputStyle}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
        </div>

        <div>
          <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
            Правовая форма
          </label>
          <select value={legalForm}
            onChange={(e) => setLegalForm(e.target.value as 'ood' | 'et' | 'self')}
            style={inputStyle}>
            {LEGAL_FORM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
            Страна регистрации
          </label>
          <select value={country} onChange={(e) => setCountry(e.target.value)}
            style={inputStyle}>
            {COUNTRY_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
            Налоговое резидентство
          </label>
          <select value={taxRes} onChange={(e) => setTaxRes(e.target.value)}
            style={inputStyle}>
            {COUNTRY_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
            Валюта
          </label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}
            style={inputStyle}>
            {['EUR', 'USD', 'GBP', 'AED', 'GEL'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'ДДС регистрация', value: hasVat, set: setHasVat },
          { label: 'Есть сотрудники', value: hasEmp, set: setHasEmp },
          { label: 'Offshore / Holding', value: isOffshore, set: setIsOffshore },
        ].map(({ label, value, set }) => (
          <button key={label}
            onClick={() => set(!value)}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition-colors"
            style={{
              border: value ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
              backgroundColor: value ? 'var(--accent-light)' : 'var(--surface)',
              color: value ? 'var(--accent-text)' : 'var(--text-secondary)',
            }}>
            <div className="w-4 h-4 rounded flex items-center justify-center"
              style={{
                border: `1.5px solid ${value ? 'var(--accent)' : 'var(--border-strong)'}`,
                backgroundColor: value ? 'var(--accent)' : 'transparent',
              }}>
              {value && <span className="text-white text-xs">✓</span>}
            </div>
            {label}
          </button>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
          Заметки (необязательно)
        </label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="IP holding для роялти, операционная компания..."
          style={{ ...inputStyle, resize: 'none' }}
          onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onSave({
            name, eik, legalForm: legalForm as 'ood' | 'et' | 'self',
            country, currency, taxResidency: taxRes,
            hasVat, hasEmployees: hasEmp, isOffshore, notes, color,
          })}
          disabled={!name.trim()}
          className="rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--accent)' }}>
          Сохранить
        </button>
        <button onClick={onCancel}
          className="rounded-xl px-5 py-2 text-sm"
          style={{ border: '1.5px solid var(--border)', color: 'var(--text-secondary)' }}>
          Отмена
        </button>
      </div>
    </div>
  )
}

export default function Companies() {
  const {
    companies, activeCompanyId, isSynced,
    addCompany, updateCompany, removeCompany, setActive,
  } = useCompaniesStore()
  const { isDemo } = useAuthStore()
  const { relations, addRelation, removeRelation } = useGroupStore()
  const { checkAccess } = usePaywall()

  const [tab,             setTab]             = useState<CompaniesTab>('companies')
  const [showAddForm,     setShowAddForm]     = useState(false)
  const [editingId,       setEditingId]       = useState<string | null>(null)
  const [showAddRelation, setShowAddRelation] = useState(false)
  const [paywallReason,   setPaywallReason]   = useState<'add_company' | null>(null)
  const [relFrom,         setRelFrom]         = useState('')
  const [relTo,           setRelTo]           = useState('')
  const [relType,         setRelType]         = useState<RelationType>('subsidiary')
  const [relPct,          setRelPct]          = useState(100)
  const [relFlow,         setRelFlow]         = useState(0)
  const [relNotes,        setRelNotes]        = useState('')

  const handleAddCompany = (data: Omit<Company, 'id' | 'createdAt'>) => {
    const id = addCompany(data)
    if (companies.length === 0) setActive(id)
    ensureCapitalEntry()
    setShowAddForm(false)
  }

  const handleUpdateCompany = (data: Omit<Company, 'id' | 'createdAt'>) => {
    if (editingId) {
      updateCompany(editingId, data)
      setEditingId(null)
    }
  }

  const handleAddRelation = () => {
    if (!relFrom || !relTo) return
    addRelation({
      fromCompanyId: relFrom,
      toCompanyId:   relTo,
      type:          relType,
      ownershipPct:  relPct,
      annualFlow:    relFlow || undefined,
      notes:         relNotes,
    })
    setShowAddRelation(false)
    setRelFrom(''); setRelTo(''); setRelNotes('')
  }

  const inputStyle = {
    border: '1.5px solid var(--border)',
    backgroundColor: 'var(--surface)',
    color: 'var(--text-primary)',
    borderRadius: 12,
    padding: '8px 12px',
    fontSize: 13,
    outline: 'none',
  }

  return (
    <div className="flex flex-col h-full">

      {/* Tab navigation */}
      <div className="border-b px-6 pt-4"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-card)' }}>
        <h1 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          Компании и группа
        </h1>
        <div className="flex gap-1">
          {([
            { id: 'companies', label: '🏢 Компании' },
            { id: 'optimizer', label: '💡 Налоговый оптимизатор' },
          ] as { id: CompaniesTab; label: string }[]).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors"
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
      {tab === 'optimizer' && <GroupOptimizer />}
      {tab === 'companies' && (
      <div className="space-y-6 p-6">

      {/* Sync notice */}
      {!isDemo && isSynced && companies.length > 0 && (
        <div className="rounded-xl p-3"
          style={{ backgroundColor: 'var(--accent-light)',
                   border: '1px solid var(--accent)' }}>
          <p className="text-xs" style={{ color: 'var(--accent-text)' }}>
            ✅ Данные синхронизированы с сервером.
            {' '}{companies.length} компани{companies.length === 1 ? 'я' : 'и'} загружено.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <HelpButton
            topic="группа компаний трансфертное ценообразование налоговая оптимизация"
            title="Группа компаний"
            pageContext="companies"
          />
        </div>
        <button
          onClick={() => {
            if (!checkAccess('add_company')) { setPaywallReason('add_company'); return }
            setShowAddForm(true)
          }}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--accent)' }}>
          + Добавить компанию
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <CompanyForm
          onSave={handleAddCompany}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Companies grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {companies.map((company) => (
          editingId === company.id ? (
            <CompanyForm
              key={company.id}
              initial={company}
              onSave={handleUpdateCompany}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <CompanyCard
              key={company.id}
              company={company}
              isActive={company.id === activeCompanyId}
              onActivate={() => setActive(company.id)}
              onEdit={() => setEditingId(company.id)}
              onDelete={() => {
                if (companies.length > 1) removeCompany(company.id)
              }}
            />
          )
        ))}
      </div>

      {companies.length === 0 && !showAddForm && (
        <div className="rounded-xl border border-dashed py-12 text-center"
          style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Нет компаний. Добавьте первую.
          </p>
        </div>
      )}

      {/* Group relations */}
      {companies.length > 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Структура группы
            </h2>
            <button
              onClick={() => {
                if (!checkAccess('add_company')) { setPaywallReason('add_company'); return }
                setShowAddRelation(true)
              }}
              className="rounded-xl px-4 py-2 text-sm font-medium"
              style={{
                border: '1.5px solid var(--accent)',
                color: 'var(--accent)',
                backgroundColor: 'var(--accent-light)',
              }}>
              + Добавить связь
            </button>
          </div>

          {/* Add relation form */}
          {showAddRelation && (
            <div className="rounded-xl p-4 space-y-3"
              style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                    От компании
                  </label>
                  <select value={relFrom} onChange={(e) => setRelFrom(e.target.value)}
                    style={{ ...inputStyle, width: '100%' }}>
                    <option value="">Выберите...</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                    К компании
                  </label>
                  <select value={relTo} onChange={(e) => setRelTo(e.target.value)}
                    style={{ ...inputStyle, width: '100%' }}>
                    <option value="">Выберите...</option>
                    {companies.filter(c => c.id !== relFrom).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Тип связи
                  </label>
                  <select value={relType}
                    onChange={(e) => setRelType(e.target.value as RelationType)}
                    style={{ ...inputStyle, width: '100%' }}>
                    {Object.entries(RELATION_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Доля владения (%)
                  </label>
                  <input type="number" value={relPct} min={0} max={100}
                    onChange={(e) => setRelPct(Number(e.target.value))}
                    style={{ ...inputStyle, width: '100%' }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
                </div>
                <div>
                  <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Годовой поток €/год
                  </label>
                  <input type="number" value={relFlow}
                    onChange={(e) => setRelFlow(Number(e.target.value))}
                    placeholder="0"
                    style={{ ...inputStyle, width: '100%' }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
                </div>
                <div>
                  <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Заметки
                  </label>
                  <input value={relNotes} onChange={(e) => setRelNotes(e.target.value)}
                    placeholder="Роялти за IP, дивиденды..."
                    style={{ ...inputStyle, width: '100%' }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddRelation}
                  disabled={!relFrom || !relTo}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  style={{ backgroundColor: 'var(--accent)' }}>
                  Добавить связь
                </button>
                <button onClick={() => setShowAddRelation(false)}
                  className="rounded-xl px-4 py-2 text-sm"
                  style={{ border: '1.5px solid var(--border)', color: 'var(--text-secondary)' }}>
                  Отмена
                </button>
              </div>
            </div>
          )}

          {/* Relations list */}
          {relations.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Нет связей между компаниями. Добавьте структуру группы.
            </p>
          ) : (
            <div className="space-y-2">
              {relations.map((rel) => {
                const from = companies.find(c => c.id === rel.fromCompanyId)
                const to   = companies.find(c => c.id === rel.toCompanyId)
                if (!from || !to) return null
                return (
                  <div key={rel.id}
                    className="flex items-center gap-3 rounded-xl p-3"
                    style={{
                      backgroundColor: 'var(--surface-card)',
                      border: '1px solid var(--border)',
                    }}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: from.color }} />
                        <span className="text-sm font-medium truncate"
                          style={{ color: 'var(--text-primary)' }}>
                          {from.name}
                        </span>
                      </div>
                      <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                        →
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: to.color }} />
                        <span className="text-sm font-medium truncate"
                          style={{ color: 'var(--text-primary)' }}>
                          {to.name}
                        </span>
                      </div>
                      <span className="rounded-full px-2 py-0.5 text-xs shrink-0"
                        style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-text)' }}>
                        {RELATION_LABELS[rel.type]}
                      </span>
                      {rel.ownershipPct && (
                        <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                          {rel.ownershipPct}%
                        </span>
                      )}
                      {rel.annualFlow && (
                        <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                          · {rel.annualFlow.toLocaleString()} €/год
                        </span>
                      )}
                    </div>
                    <button onClick={() => removeRelation(rel.id)}
                      className="text-lg shrink-0"
                      style={{ color: 'var(--text-muted)' }}>
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
      </div>
      )}
      </div>

      {paywallReason && (
        <PaywallModal
          reason={paywallReason}
          onClose={() => setPaywallReason(null)}
        />
      )}
    </div>
  )
}
