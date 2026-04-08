import { useState } from 'react'
import { useUserStore } from '../store/userStore'
import type { AppLanguage, LegalForm } from '../store/userStore'
import { fetchOpenRouterModels } from '../lib/llmCatalog'

const LANGUAGES: { value: AppLanguage; label: string; flag: string }[] = [
  { value: 'ru', label: 'Русский',    flag: '🇷🇺' },
  { value: 'uk', label: 'Українська', flag: '🇺🇦' },
  { value: 'en', label: 'English',    flag: '🇬🇧' },
  { value: 'bg', label: 'Български',  flag: '🇧🇬' },
]

const LEGAL_FORMS: { value: LegalForm; label: string; desc: string }[] = [
  { value: 'ood',  label: 'ООД / ЕООД',       desc: 'Юрлицо · КНП 10% · дивиденти 7%' },
  { value: 'et',   label: 'ЕТ',                desc: 'Индивидуальный торговец · ДДФЛ 10%' },
  { value: 'self', label: 'Самоосигуряващ се', desc: 'Фрилансер · ДДФЛ 10% · норм. разходи 25%' },
]

export default function Settings() {
  const store = useUserStore()
  const [saved,         setSaved]         = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [models,        setModels]        = useState<string[]>([])
  const [modelError,    setModelError]    = useState<string | null>(null)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleLoadModels = async () => {
    setLoadingModels(true)
    setModelError(null)
    try {
      const list = await fetchOpenRouterModels(store.llmApiKey || undefined)
      setModels(list.slice(0, 60).map((m) => m.id))
    } catch {
      setModelError('Ошибка загрузки — проверьте API ключ')
    } finally {
      setLoadingModels(false)
    }
  }

  const inputStyle = {
    border: '1.5px solid var(--border)',
    backgroundColor: 'var(--surface)',
    color: 'var(--text-primary)',
    borderRadius: 12,
    padding: '10px 16px',
    fontSize: 14,
    width: '100%',
    outline: 'none',
  }

  const sectionStyle = {
    backgroundColor: 'var(--surface-card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: 20,
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Настройки
        </h1>
        <div className="mt-2 h-2 w-20 rounded-full bg-flag-stripe" />
      </div>

      {/* Language */}
      <div style={sectionStyle}>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--text-muted)' }}>Език на интерфейса</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LANGUAGES.map((lang) => (
            <button key={lang.value} onClick={() => store.setLanguage(lang.value)}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm transition-colors"
              style={{
                border: store.language === lang.value
                  ? '2px solid var(--accent)'
                  : '2px solid var(--border)',
                backgroundColor: store.language === lang.value
                  ? 'var(--accent-light)'
                  : 'var(--surface)',
                color: store.language === lang.value
                  ? 'var(--accent-text)'
                  : 'var(--text-secondary)',
                fontWeight: store.language === lang.value ? 600 : 400,
              }}>
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Legal form */}
      <div style={sectionStyle}>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--text-muted)' }}>Правна форма</h2>
        <div className="space-y-2">
          {LEGAL_FORMS.map((form) => (
            <button key={form.value} onClick={() => store.setLegalForm(form.value)}
              className="w-full rounded-xl px-4 py-3 text-left transition-colors"
              style={{
                border: store.legalForm === form.value
                  ? '2px solid var(--accent)'
                  : '2px solid var(--border)',
                backgroundColor: store.legalForm === form.value
                  ? 'var(--accent-light)'
                  : 'var(--surface)',
              }}>
              <div className="font-medium text-sm"
                style={{ color: store.legalForm === form.value ? 'var(--accent-text)' : 'var(--text-primary)' }}>
                {form.label}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {form.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Company */}
      <div style={sectionStyle}>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--text-muted)' }}>Компания</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Название компании', value: store.companyName, set: store.setCompanyName, placeholder: 'Acme OOD' },
            { label: 'ЕИК / Булстат',    value: store.eik,         set: store.setEik,         placeholder: '123456789' },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                {label}
              </label>
              <input value={value} onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          ))}
          <div>
            <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
              Период (YYYY-MM)
            </label>
            <input value={store.taxPeriod} onChange={(e) => store.setTaxPeriod(e.target.value)}
              placeholder="2026-04"
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <div className="flex items-start gap-3 rounded-xl p-3 cursor-pointer"
            style={{
              border: store.hasVat ? '2px solid var(--accent)' : '2px solid var(--border)',
              backgroundColor: store.hasVat ? 'var(--accent-light)' : 'var(--surface)',
            }}
            onClick={() => store.setHasVat(!store.hasVat)}>
            <div className="h-5 w-5 rounded flex items-center justify-center shrink-0 mt-0.5"
              style={{
                border: `2px solid ${store.hasVat ? 'var(--accent)' : 'var(--border-strong)'}`,
                backgroundColor: store.hasVat ? 'var(--accent)' : 'transparent',
              }}>
              {store.hasVat && <span className="text-white text-xs">✓</span>}
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                ДДС регистрация
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Порог: 51 130 €/год
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LLM */}
      <div style={sectionStyle}>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--text-muted)' }}>AI модел (OpenRouter)</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
              API ключ
            </label>
            <input type="password" value={store.llmApiKey}
              onChange={(e) => store.setLlmApiKey(e.target.value)}
              placeholder="sk-or-..."
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                Модел
              </label>
              {models.length > 0 ? (
                <select value={store.llmModel}
                  onChange={(e) => store.setLlmModel(e.target.value)}
                  style={inputStyle}>
                  {models.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <input value={store.llmModel}
                  onChange={(e) => store.setLlmModel(e.target.value)}
                  placeholder="anthropic/claude-sonnet-4-5"
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                />
              )}
            </div>
            <button onClick={handleLoadModels} disabled={loadingModels}
              className="mt-5 rounded-xl px-4 py-2.5 text-sm transition-colors disabled:opacity-40"
              style={{
                border: '1.5px solid var(--border)',
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--surface)',
              }}>
              {loadingModels ? '...' : 'Список'}
            </button>
          </div>
          {modelError && (
            <p className="text-xs" style={{ color: 'var(--danger)' }}>{modelError}</p>
          )}
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Все модели:{' '}
            <a href="https://openrouter.ai/models" target="_blank" rel="noreferrer"
              style={{ color: 'var(--accent)' }} className="underline">
              openrouter.ai/models
            </a>
          </p>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-between">
        <button onClick={handleSave}
          className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: 'var(--accent)' }}>
          {saved ? '✓ Запазено' : 'Запази'}
        </button>
        <button onClick={() => store.setOnboardingDone(false)}
          className="text-xs underline"
          style={{ color: 'var(--text-muted)' }}>
          Повторить онбординг
        </button>
      </div>
    </div>
  )
}
