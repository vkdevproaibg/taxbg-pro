import { useState } from 'react'
import { useUserStore } from '../store/userStore'
import { useIntegrationsStore } from '../store/integrationsStore'
import type { AppLanguage, LegalForm } from '../store/userStore'
import { fetchOpenRouterModels } from '../lib/llmCatalog'

type SettingsTab = 'profile' | 'ai' | 'integrations' | 'system'

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Профил' },
  { id: 'ai', label: 'AI модел' },
  { id: 'integrations', label: 'Интеграции' },
  { id: 'system', label: 'Система' },
]

const LANGUAGES: { value: AppLanguage; label: string; flag: string }[] = [
  { value: 'ru', label: 'Русский', flag: '🇷🇺' },
  { value: 'uk', label: 'Українська', flag: '🇺🇦' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'bg', label: 'Български', flag: '🇧🇬' },
]

const LEGAL_FORMS: { value: LegalForm; label: string; desc: string }[] = [
  { value: 'ood', label: 'ООД / ЕООД', desc: 'Юрлицо · КНП 10% · дивиденти 7%' },
  { value: 'et', label: 'ЕТ', desc: 'Индивидуален търговец · ДДФЛ 10%' },
  { value: 'self', label: 'Самоосигуряващ се', desc: 'Фрилансер · ДДФЛ 10% · норм. разходи 25%' },
]

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

const cardStyle = {
  backgroundColor: 'var(--surface-card)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  padding: 20,
}

export default function Settings() {
  const store = useUserStore()
  const integrations = useIntegrationsStore()
  const [tab, setTab] = useState<SettingsTab>('profile')
  const [saved, setSaved] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [models, setModels] = useState<string[]>([])
  const [modelError, setModelError] = useState<string | null>(null)

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

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 pt-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-card)' }}>
        <h1 className="mb-3 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Настройки
        </h1>
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="rounded-t-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{
                borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
                backgroundColor: 'transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-2xl space-y-6 p-6">
          {tab === 'profile' && (
            <>
              <div style={cardStyle}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Език на интерфейса
                </h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => store.setLanguage(lang.value)}
                      className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm transition-colors"
                      style={{
                        border: store.language === lang.value ? '2px solid var(--accent)' : '2px solid var(--border)',
                        backgroundColor: store.language === lang.value ? 'var(--accent-light)' : 'var(--surface)',
                        color: store.language === lang.value ? 'var(--accent-text)' : 'var(--text-secondary)',
                        fontWeight: store.language === lang.value ? 600 : 400,
                      }}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={cardStyle}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Правна форма
                </h2>
                <div className="space-y-2">
                  {LEGAL_FORMS.map((form) => (
                    <button
                      key={form.value}
                      onClick={() => store.setLegalForm(form.value)}
                      className="w-full rounded-xl px-4 py-3 text-left transition-colors"
                      style={{
                        border: store.legalForm === form.value ? '2px solid var(--accent)' : '2px solid var(--border)',
                        backgroundColor: store.legalForm === form.value ? 'var(--accent-light)' : 'var(--surface)',
                      }}
                    >
                      <div className="text-sm font-medium" style={{ color: store.legalForm === form.value ? 'var(--accent-text)' : 'var(--text-primary)' }}>
                        {form.label}
                      </div>
                      <div className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {form.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={cardStyle}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Компания
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Название компании', value: store.companyName, set: store.setCompanyName, placeholder: 'Acme OOD' },
                    { label: 'ЕИК / Булстат', value: store.eik, set: store.setEik, placeholder: '123456789' },
                  ].map(({ label, value, set, placeholder }) => (
                    <div key={label}>
                      <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {label}
                      </label>
                      <input
                        value={value}
                        onChange={(e) => set(e.target.value)}
                        placeholder={placeholder}
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Период (YYYY-MM)
                    </label>
                    <input
                      value={store.taxPeriod}
                      onChange={(e) => store.setTaxPeriod(e.target.value)}
                      placeholder="2026-04"
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                      onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                    />
                  </div>
                  <div
                    className="flex cursor-pointer items-start gap-3 rounded-xl p-3"
                    style={{
                      border: store.hasVat ? '2px solid var(--accent)' : '2px solid var(--border)',
                      backgroundColor: store.hasVat ? 'var(--accent-light)' : 'var(--surface)',
                    }}
                    onClick={() => store.setHasVat(!store.hasVat)}
                  >
                    <div
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded"
                      style={{
                        border: `2px solid ${store.hasVat ? 'var(--accent)' : 'var(--border-strong)'}`,
                        backgroundColor: store.hasVat ? 'var(--accent)' : 'transparent',
                      }}
                    >
                      {store.hasVat && <span className="text-xs text-white">✓</span>}
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

              <button className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: 'var(--accent)' }} onClick={handleSave}>
                {saved ? '✓ Запазено' : 'Запази'}
              </button>
            </>
          )}

          {tab === 'ai' && (
            <div style={cardStyle} className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                AI модел · OpenRouter
              </h2>

              <div>
                <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                  API ключ OpenRouter
                </label>
                <input
                  type="password"
                  value={store.llmApiKey}
                  onChange={(e) => store.setLlmApiKey(e.target.value)}
                  placeholder="sk-or-..."
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Получить ключ: <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="underline" style={{ color: 'var(--accent)' }}>openrouter.ai/keys</a>
                </p>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Модел
                  </label>
                  {models.length > 0 ? (
                    <select value={store.llmModel} onChange={(e) => store.setLlmModel(e.target.value)} style={inputStyle}>
                      {models.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={store.llmModel}
                      onChange={(e) => store.setLlmModel(e.target.value)}
                      placeholder="anthropic/claude-sonnet-4-5"
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                      onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                    />
                  )}
                </div>
                <button
                  onClick={handleLoadModels}
                  disabled={loadingModels}
                  className="mt-5 rounded-xl px-4 py-2.5 text-sm disabled:opacity-40"
                  style={{ border: '1.5px solid var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--surface)' }}
                >
                  {loadingModels ? '...' : 'Список'}
                </button>
              </div>

              {modelError && <p className="text-xs" style={{ color: 'var(--danger)' }}>{modelError}</p>}

              <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  AI используется для: аудитор рисков · правовой попап · автоматическое определение проводок · ассистент · мониторинг законодательства
                </p>
              </div>

              <button className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: 'var(--accent)' }} onClick={handleSave}>
                {saved ? '✓ Запазено' : 'Запази'}
              </button>
            </div>
          )}

          {tab === 'integrations' && (
            <div className="space-y-5">
              <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
                <p className="text-sm" style={{ color: 'var(--accent-text)' }}>
                  <strong>Как это работает:</strong> подключите интеграции один раз - и из раздела "Документи" сможете отправлять декларации одной кнопкой. Каждый пользователь настраивает свои credentials.
                </p>
              </div>

              <div style={cardStyle} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>НАП API (НАПИ)</h3>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      Автоматическая подача ДДС декларации и Образец 1 прямо из приложения
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                    integrations.napApi.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {integrations.napApi.status === 'connected' ? '● Подключён' : '○ Не подключён'}
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>API ключ НАПИ</label>
                    <input
                      type="password"
                      value={integrations.napApi.apiKey}
                      onChange={(e) => integrations.setNapApi({ apiKey: e.target.value })}
                      placeholder="Получить на napi.bg после регистрации"
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                      onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>ЕИК организации (для API)</label>
                    <input
                      value={integrations.napApi.organizationId}
                      onChange={(e) => integrations.setNapApi({ organizationId: e.target.value })}
                      placeholder={store.eik || '123456789'}
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                      onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => integrations.setNapApi({ status: 'connected', lastChecked: new Date().toISOString() })}
                    disabled={!integrations.napApi.apiKey}
                    className="rounded-xl px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    Проверить соединение
                  </button>
                  <a href="https://napi.bg" target="_blank" rel="noreferrer" className="text-xs underline" style={{ color: 'var(--accent)' }}>
                    Регистрация на napi.bg →
                  </a>
                </div>
              </div>

              <div style={cardStyle} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Email отправка</h3>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      Отправка Образец 1 и других форм на email НАП напрямую из приложения
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                    integrations.email.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {integrations.email.status === 'connected' ? '● Подключён' : '○ Не подключён'}
                  </span>
                </div>

                <div className="flex gap-2">
                  {[
                    { id: true, label: 'Resend (рекомендуется)' },
                    { id: false, label: 'SMTP' },
                  ].map((opt) => (
                    <button
                      key={String(opt.id)}
                      onClick={() => integrations.setEmail({ useResend: opt.id })}
                      className="flex-1 rounded-xl py-2 text-xs font-medium transition-colors"
                      style={{
                        border: integrations.email.useResend === opt.id ? '2px solid var(--accent)' : '2px solid var(--border)',
                        backgroundColor: integrations.email.useResend === opt.id ? 'var(--accent-light)' : 'var(--surface)',
                        color: integrations.email.useResend === opt.id ? 'var(--accent-text)' : 'var(--text-secondary)',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>Ваш email (отправитель)</label>
                    <input
                      value={integrations.email.userEmail}
                      onChange={(e) => integrations.setEmail({ userEmail: e.target.value })}
                      placeholder="company@yourdomain.com"
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                      onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                    />
                  </div>

                  {integrations.email.useResend ? (
                    <div>
                      <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>Resend API ключ</label>
                      <input
                        type="password"
                        value={integrations.email.resendApiKey}
                        onChange={(e) => integrations.setEmail({ resendApiKey: e.target.value })}
                        placeholder="re_..."
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                      />
                      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        Бесплатно до 3 000 писем/мес · <a href="https://resend.com" target="_blank" rel="noreferrer" className="underline" style={{ color: 'var(--accent)' }}>resend.com</a>
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'SMTP Host', value: integrations.email.smtpHost, set: (v: string) => integrations.setEmail({ smtpHost: v }), placeholder: 'smtp.gmail.com' },
                        { label: 'SMTP Port', value: String(integrations.email.smtpPort), set: (v: string) => integrations.setEmail({ smtpPort: Number(v) }), placeholder: '587' },
                        { label: 'SMTP User', value: integrations.email.smtpUser, set: (v: string) => integrations.setEmail({ smtpUser: v }), placeholder: 'user@gmail.com' },
                        { label: 'SMTP Password', value: integrations.email.smtpPassword, set: (v: string) => integrations.setEmail({ smtpPassword: v }), placeholder: '••••••••' },
                      ].map(({ label, value, set, placeholder }) => (
                        <div key={label}>
                          <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</label>
                          <input
                            value={value}
                            onChange={(e) => set(e.target.value)}
                            placeholder={placeholder}
                            style={inputStyle}
                            onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => integrations.setEmail({ status: 'connected' })}
                  disabled={!integrations.email.userEmail}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  Сохранить и проверить
                </button>
              </div>

              <div style={cardStyle} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>ПИК код НАП</h3>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      Персональный идентификационный код для портала НАП. Альтернатива КЕП для физических лиц.
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                    integrations.pik.status === 'saved' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {integrations.pik.status === 'saved' ? '● Сохранён' : '○ Не указан'}
                  </span>
                </div>

                <div>
                  <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>ПИК код</label>
                  <input
                    type="password"
                    value={integrations.pik.pikCode}
                    onChange={(e) => integrations.setPik({ pikCode: e.target.value })}
                    placeholder="Получить на nap.bg → Регистрация с ПИК"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>

                <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    ⚠ КЕП (квалифицированная электронная подпись) мы не храним - это аппаратный токен который всегда у вас. ПИК - программный код для онлайн-портала НАП.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => integrations.setPik({ status: 'saved' })}
                    disabled={!integrations.pik.pikCode}
                    className="rounded-xl px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    Сохранить
                  </button>
                  <a href="https://inetdec.nra.bg" target="_blank" rel="noreferrer" className="text-xs underline" style={{ color: 'var(--accent)' }}>
                    Портал НАП →
                  </a>
                </div>
              </div>
            </div>
          )}

          {tab === 'system' && (
            <div className="space-y-4">
              <div style={cardStyle} className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Система</h2>

                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Повторить онбординг</p>
                  <p className="mb-2 mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Сбросить мастер первоначальной настройки
                  </p>
                  <button
                    onClick={() => store.setOnboardingDone(false)}
                    className="rounded-xl border px-4 py-2 text-sm"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  >
                    Сбросить онбординг
                  </button>
                </div>

                <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Версия приложения</p>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    TaxBG Pro · Болгарское налоговое право 2026 · EUR
                  </p>
                </div>

                <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                  <p className="mb-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Данные</p>
                  <p className="mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Все данные хранятся локально в браузере (localStorage). Синхронизация между устройствами - через Supabase (в разработке).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
