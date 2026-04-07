import { useState } from 'react'
import { useUserStore } from '../store/userStore'
import type { AppLanguage, LegalForm } from '../store/userStore'
import { fetchOpenRouterModels } from '../lib/llmCatalog'

const LANGUAGES: { value: AppLanguage; label: string; flag: string }[] = [
  { value: 'ru', label: 'Русский', flag: '🇷🇺' },
  { value: 'uk', label: 'Українська', flag: '🇺🇦' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'bg', label: 'Български', flag: '🇧🇬' },
]

const LEGAL_FORMS: { value: LegalForm; label: string; desc: string }[] = [
  { value: 'ood', label: 'ООД (LLC)', desc: 'Юрлицо · КНП 10% · дивиденды 7%' },
  { value: 'et', label: 'ЕТ (ИП)', desc: 'Индивидуальный торговец · ДДФЛ 10%' },
  { value: 'self', label: 'Самоосигуряващ се', desc: 'Фрилансер · ДДФЛ 10% · норм. разходи 25%' },
]

export default function Settings() {
  const store = useUserStore()
  const [saved, setSaved] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [loadingModels, setLoadingModels] = useState(false)
  const [models, setModels] = useState<string[]>([])

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleLoadModels = async () => {
    setLoadingModels(true)
    try {
      const list = await fetchOpenRouterModels(store.llmApiKey || undefined)
      setModels(list.slice(0, 50).map(m => m.id))
    } catch {
      setTestResult('Ошибка загрузки моделей — проверьте API ключ')
    } finally {
      setLoadingModels(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <h1 className="text-2xl font-semibold">Настройки</h1>

      {/* Language */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">Език на интерфейса</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LANGUAGES.map(lang => (
            <button key={lang.value} onClick={() => store.setLanguage(lang.value)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors ${
                store.language === lang.value
                  ? 'border-violet-500 bg-violet-50 font-medium text-violet-700'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}>
              <span>{lang.flag}</span>{lang.label}
            </button>
          ))}
        </div>
      </section>

      {/* Legal form */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">Правна форма</h2>
        <div className="space-y-2">
          {LEGAL_FORMS.map(form => (
            <button key={form.value} onClick={() => store.setLegalForm(form.value)}
              className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                store.legalForm === form.value
                  ? 'border-violet-500 bg-violet-50'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}>
              <div className={`font-medium ${store.legalForm === form.value ? 'text-violet-700' : ''}`}>{form.label}</div>
              <div className="mt-0.5 text-xs text-slate-500">{form.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Company name + tax period */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">Компания</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Название</label>
            <input value={store.companyName} onChange={e => store.setCompanyName(e.target.value)}
              placeholder="Acme OOD..."
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Текущий период (YYYY-MM)</label>
            <input value={store.taxPeriod} onChange={e => store.setTaxPeriod(e.target.value)}
              placeholder="2026-04"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none" />
          </div>
        </div>
      </section>

      {/* LLM */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">AI модел (OpenRouter)</h2>
        <div>
          <label className="mb-1 block text-xs text-slate-400">API ключ</label>
          <input type="password" value={store.llmApiKey} onChange={e => store.setLlmApiKey(e.target.value)}
            placeholder="sk-or-..."
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-slate-400">Модел</label>
            {models.length > 0 ? (
              <select value={store.llmModel} onChange={e => store.setLlmModel(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none">
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            ) : (
              <input value={store.llmModel} onChange={e => store.setLlmModel(e.target.value)}
                placeholder="anthropic/claude-sonnet-4-5"
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none" />
            )}
          </div>
          <button onClick={handleLoadModels} disabled={loadingModels}
            className="mt-5 whitespace-nowrap rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">
            {loadingModels ? '...' : 'Загрузить список'}
          </button>
        </div>
        {testResult && <p className="text-xs text-red-500">{testResult}</p>}
        <p className="text-xs text-slate-400">
          Все модели: <a href="https://openrouter.ai/models" target="_blank" rel="noreferrer" className="text-violet-500 underline">openrouter.ai/models</a>
        </p>
      </section>

      <button onClick={handleSave}
        className="rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-700">
        {saved ? 'Запазено ✓' : 'Запази'}
      </button>
      <div className="pt-4 border-t border-slate-100">
        <button onClick={() => store.setOnboardingDone(false)}
          className="text-xs text-slate-400 hover:text-slate-600 underline">
          Повторить онбординг (сбросить мастер настройки)
        </button>
      </div>
    </div>
  )
}
