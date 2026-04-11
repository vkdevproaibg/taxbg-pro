import { useState, useEffect } from 'react'
import {
  EMPTY_COMPANY_FORM,
  generateAllDocs,
  downloadDocumentPackage,
  type CompanyFormData,
} from '../../lib/companyDocuments'

const LS_KEY = 'eood_company_form'

const inputBase: React.CSSProperties = {
  border: '1.5px solid var(--border)',
  backgroundColor: 'var(--surface)',
  color: 'var(--text-primary)',
  borderRadius: '0.75rem',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
}

const labelBase: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: '0.75rem',
  display: 'block',
  marginBottom: '0.25rem',
}

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
  type?: string
  required?: boolean
}

function Field({ label, value, onChange, hint, type = 'text', required }: FieldProps) {
  return (
    <div>
      <label style={labelBase}>
        {label}
        {required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={inputBase}
        onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
        onBlur={e =>  (e.target.style.borderColor = 'var(--border)')}
      />
      {hint && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.25rem' }}>
          💡 {hint}
        </p>
      )}
    </div>
  )
}

export default function DocumentPackageTab() {
  const [form, setForm] = useState<CompanyFormData>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      return saved ? { ...EMPTY_COMPANY_FORM, ...JSON.parse(saved) } : EMPTY_COMPANY_FORM
    } catch { return EMPTY_COMPANY_FORM }
  })
  const [loading, setLoading] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<string | null>(null)

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(form)) } catch {}
  }, [form])

  const set = (field: keyof CompanyFormData) =>
    (v: string) => setForm(prev => ({ ...prev, [field]: v }))

  const docs = generateAllDocs(form)

  const handleDownload = async () => {
    setLoading(true)
    try {
      await downloadDocumentPackage(form)
    } catch (err) {
      alert('Ошибка: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5 p-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="rounded-xl p-4"
        style={{ backgroundColor: 'var(--accent-light)',
                 border: '1px solid var(--accent)' }}>
        <p className="text-sm font-semibold mb-1"
          style={{ color: 'var(--accent-text)' }}>
          📁 Пакет учредителни документи за ЕООД
        </p>
        <p className="text-xs" style={{ color: 'var(--accent-text)' }}>
          Попълнете данните веднъж — генерира се пълен пакет
          от 10 документа за БРРА, банка и НАП.
          Данните се запазват автоматично.
        </p>
      </div>

      {/* Warning */}
      <div className="rounded-xl p-3 flex items-start gap-2"
        style={{ backgroundColor: '#fffbeb', border: '1px solid #f59e0b' }}>
        <span className="text-sm shrink-0">⚠️</span>
        <p className="text-xs" style={{ color: '#92400e' }}>
          Документите са проект (draft) за самоподготовка.
          Преди подаване в БРРА задължително ги проверете
          с юрист/нотариус и ги подпишете лично.
        </p>
      </div>

      {/* Company data */}
      <p className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: 'var(--text-muted)' }}>
        Данни за дружеството
      </p>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Field label="Наименование на дружеството" required
            value={form.companyName} onChange={set('companyName')}
            hint="Само уникалната част: TECHSTART (без ЕООД)" />
        </div>
        <div>
          <label style={labelBase}>Тип *</label>
          <select value={form.companySuffix}
            onChange={e => setForm(p => ({ ...p, companySuffix: e.target.value }))}
            style={inputBase}>
            <option value="ЕООД">ЕООД (1 собственик)</option>
            <option value="ООД">ООД (2+ собственика)</option>
          </select>
        </div>
      </div>

      <Field label="Седалище и адрес на управление" required
        value={form.registeredAddress} onChange={set('registeredAddress')}
        hint="гр. София, р-н Средец, ул. Витоша №15, ет.3" />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Уставен капитал (€)" required
          value={form.capital} onChange={set('capital')}
          hint="Минимум 1 € (от 01.01.2026 Болгария е в еврозоната). Препоръчително 100-500 €" />
        <Field label="ЕИК (след вписване)"
          value={form.eik} onChange={set('eik')}
          hint="9 цифри — оставете празно при учредяване" />
      </div>

      <div>
        <label style={labelBase}>Предмет на дейност *</label>
        <textarea value={form.mainActivity}
          onChange={e => setForm(p => ({ ...p, mainActivity: e.target.value }))}
          rows={3}
          style={{ ...inputBase, resize: 'vertical' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.25rem' }}>
          💡 Широкият предмет покрива всичко незабранено. Редактирайте само ако имате специфична дейност.
        </p>
      </div>

      {/* Director */}
      <p className="text-xs font-semibold uppercase tracking-wider pt-2"
        style={{ color: 'var(--text-muted)' }}>
        Данни за управителя / едноличен собственик
      </p>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Фамилия" required
          value={form.directorLastName} onChange={set('directorLastName')} />
        <Field label="Собствено име" required
          value={form.directorFirstName} onChange={set('directorFirstName')} />
        <Field label="Презиме"
          value={form.directorMiddleName} onChange={set('directorMiddleName')} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Гражданство" required
          value={form.directorCitizenship} onChange={set('directorCitizenship')}
          hint="Российская Федерация / Украина" />
        <Field label="Дата на раждане" required type="date"
          value={form.directorBirthDate} onChange={set('directorBirthDate')} />
      </div>

      <Field label="Място на раждане" required
        value={form.directorBirthPlace} onChange={set('directorBirthPlace')} />

      <Field label="Постоянен адрес" required
        value={form.directorAddress} onChange={set('directorAddress')} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Номер на паспорта" required
          value={form.directorPassportNumber} onChange={set('directorPassportNumber')} />
        <Field label="Издаден от" required
          value={form.directorPassportIssuedBy} onChange={set('directorPassportIssuedBy')} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Дата на издаване" required type="date"
          value={form.directorPassportIssueDate}
          onChange={set('directorPassportIssueDate')} />
        <Field label="Валиден до" required type="date"
          value={form.directorPassportExpiry}
          onChange={set('directorPassportExpiry')} />
      </div>

      {/* Signing details */}
      <p className="text-xs font-semibold uppercase tracking-wider pt-2"
        style={{ color: 'var(--text-muted)' }}>
        Детайли на подписването
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Град на подписване" required
          value={form.cityOfSigning} onChange={set('cityOfSigning')} />
        <Field label="Дата на подписване" required type="date"
          value={form.dateOfSigning} onChange={set('dateOfSigning')} />
      </div>

      {/* Document list preview */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--text-muted)' }}>
          Документи в пакета ({docs.length} бр.)
        </p>
        <div className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}>
          {docs.map((doc, i) => (
            <div key={i}
              className="flex items-start justify-between px-4 py-3 border-b last:border-0"
              style={{ borderColor: 'var(--border)',
                       backgroundColor: 'var(--surface-card)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium"
                  style={{ color: 'var(--text-primary)' }}>
                  {String(i + 1).padStart(2, '0')}. {doc.description}
                </p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {doc.requiredFor.map(r => (
                    <span key={r} className="rounded-full px-1.5 py-0.5 text-xs"
                      style={{ backgroundColor: 'var(--accent-light)',
                               color: 'var(--accent)' }}>
                      {r}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(
                  previewDoc === doc.filename ? null : doc.filename
                )}
                className="text-xs shrink-0 ml-3"
                style={{ color: 'var(--accent)' }}>
                {previewDoc === doc.filename ? 'скрыть' : 'просмотр'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Preview panel */}
      {previewDoc && (() => {
        const doc = docs.find(d => d.filename === previewDoc)
        if (!doc) return null
        return (
          <div className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--accent)' }}>
            <div className="flex items-center justify-between px-4 py-2"
              style={{ backgroundColor: 'var(--accent-light)' }}>
              <p className="text-xs font-semibold"
                style={{ color: 'var(--accent-text)' }}>
                {doc.description}
              </p>
              <button onClick={() => setPreviewDoc(null)}
                className="text-xs" style={{ color: 'var(--accent)' }}>
                ✕
              </button>
            </div>
            <pre className="p-4 text-xs overflow-auto max-h-96 whitespace-pre-wrap"
              style={{ color: 'var(--text-secondary)',
                       backgroundColor: 'var(--surface)',
                       fontFamily: 'monospace' }}>
              {doc.content}
            </pre>
          </div>
        )
      })()}

      {/* Actions */}
      <p className="text-xs text-right"
        style={{ color: 'var(--text-muted)' }}>
        ✓ Данните се запазват автоматично
      </p>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleDownload}
          disabled={loading || !form.companyName || !form.directorLastName}
          className="rounded-xl px-5 py-2.5 text-sm font-medium text-white"
          style={{
            backgroundColor: loading || !form.companyName
              ? 'var(--border)' : 'var(--accent)',
          }}>
          {loading ? '⏳ Генериране...' : '⬇ Свали пакета (ZIP)'}
        </button>
        <button
          onClick={() => {
            if (confirm('Изчистване на всички данни?')) {
              setForm(EMPTY_COMPANY_FORM)
              localStorage.removeItem(LS_KEY)
            }
          }}
          className="rounded-xl px-4 py-2 text-xs font-medium"
          style={{ border: '1.5px solid var(--border)',
                   color: 'var(--text-muted)',
                   backgroundColor: 'transparent' }}>
          🗑 Изчисти
        </button>
      </div>

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        ZIP архивът съдържа 10 документа (.txt) в болгарски език.
        След попълването им с юрист/нотариус —
        готови за БРРА и банката.
      </p>

    </div>
  )
}
