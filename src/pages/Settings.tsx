import { useState } from 'react'
import { getAuditSummary } from '../lib/taxRatesAudit'
import { useUserStore } from '../store/userStore'
import { useIntegrationsStore } from '../store/integrationsStore'
import type { AppLanguage, LegalForm } from '../store/userStore'
import { fetchOpenRouterModels } from '../lib/llmCatalog'
import { useT } from '../lib/useT'

type SettingsTab = 'profile' | 'ai' | 'integrations' | 'system'

const LANGUAGES: { value: AppLanguage; label: string; flag: string }[] = [
  { value: 'ru', label: 'Русский', flag: '🇷🇺' },
  { value: 'uk', label: 'Українська', flag: '🇺🇦' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'bg', label: 'Български', flag: '🇧🇬' },
]

const LEGAL_FORM_VALUES: LegalForm[] = ['ood', 'et', 'self']

const UI = {
  ru: {
    title: 'Настройки',
    tabs: { profile: 'Профиль', ai: 'AI модель', integrations: 'Интеграции', system: 'Система' },
    profile: {
      lang: 'Язык интерфейса',
      legal: 'Правовая форма',
      company: 'Компания',
      companyName: 'Название компании',
      eik: 'ЕИК / Булстат',
      period: 'Период (YYYY-MM)',
      vat: 'Регистрация по ДДС',
      vatHint: 'Порог: 51 130 €/год',
    },
    legalForms: {
      ood: { label: 'ООД / ЕООД', desc: 'Юрлицо · КНП 10% · дивиденти 5%' },
      et: { label: 'ЕТ', desc: 'Индивидуальный торговец · ДДФЛ 10%' },
      self: { label: 'Самоосигуряващ се', desc: 'Фрилансер · ДДФЛ 10% · норм. разходи 25%' },
    },
    ai: {
      title: 'AI модель · OpenRouter',
      apiKey: 'API ключ OpenRouter',
      model: 'Модель',
      list: 'Список',
      loading: '...',
      save: 'Сохранить',
      saved: '✓ Сохранено',
      keyHintPrefix: 'Получить ключ:',
      usage: 'AI используется для: аудитор рисков · правовой попап · автоматическое определение проводок · ассистент · мониторинг законодательства',
      loadError: 'Ошибка загрузки — проверьте API ключ',
    },
    integrations: {
      intro: 'Как это работает:',
      introText: 'подключите интеграции один раз — и из раздела "Документи" сможете отправлять декларации одной кнопкой. Каждый пользователь настраивает свои credentials.',
      napTitle: 'НАП API (НАПИ)',
      napDesc: 'Автоматическая подача ДДС декларации и Образец 1 прямо из приложения',
      napConnected: '● Подключён',
      napDisconnected: '○ Не подключён',
      napApiKey: 'API ключ НАПИ',
      napOrg: 'ЕИК организации (для API)',
      napCheck: 'Проверить соединение',
      napLink: 'Регистрация на napi.bg →',
      emailTitle: 'Email отправка',
      emailDesc: 'Отправка Образец 1 и других форм на email НАП напрямую из приложения',
      emailConnected: '● Подключён',
      emailDisconnected: '○ Не подключён',
      resend: 'Resend (рекомендуется)',
      smtp: 'SMTP',
      sender: 'Ваш email (отправитель)',
      resendKey: 'Resend API ключ',
      resendHint: 'Бесплатно до 3 000 писем/мес ·',
      saveCheck: 'Сохранить и проверить',
      pikTitle: 'ПИК код НАП',
      pikDesc: 'Персональный идентификационный код для портала НАП. Альтернатива КЕП для физических лиц.',
      pikSaved: '● Сохранён',
      pikMissing: '○ Не указан',
      pikLabel: 'ПИК код',
      pikWarn: '⚠ КЕП (квалифицированная электронная подпись) мы не храним — это аппаратный токен, который всегда у вас. ПИК — программный код для онлайн-портала НАП.',
      pikSave: 'Сохранить',
      pikLink: 'Портал НАП →',
    },
    system: {
      title: 'Система',
      resetTitle: 'Повторить онбординг',
      resetHint: 'Сбросить мастер первоначальной настройки',
      resetBtn: 'Сбросить онбординг',
      versionTitle: 'Версия приложения',
      versionText: 'TaxBG Pro · Болгарское налоговое право 2026 · EUR',
      dataTitle: 'Данные',
      dataText: 'Все данные хранятся локально в браузере (localStorage). Синхронизация между устройствами — через Supabase (в разработке).',
    },
    commonSave: 'Запази',
    commonSaved: '✓ Запазено',
  },
  uk: {
    title: 'Налаштування',
    tabs: { profile: 'Профіль', ai: 'AI модель', integrations: 'Інтеграції', system: 'Система' },
    profile: {
      lang: 'Мова інтерфейсу',
      legal: 'Правова форма',
      company: 'Компанія',
      companyName: 'Назва компанії',
      eik: 'ЄІК / Булстат',
      period: 'Період (YYYY-MM)',
      vat: 'Реєстрація ПДВ',
      vatHint: 'Поріг: 51 130 €/рік',
    },
    legalForms: {
      ood: { label: 'ООД / ЕООД', desc: 'Юрособа · КПН 10% · дивіденди 7%' },
      et: { label: 'ЕТ', desc: 'ФОП · ПДФО 10%' },
      self: { label: 'Самозайнятий', desc: 'Фрилансер · ПДФО 10% · норм. витрати 25%' },
    },
    ai: {
      title: 'AI модель · OpenRouter',
      apiKey: 'API ключ OpenRouter',
      model: 'Модель',
      list: 'Список',
      loading: '...',
      save: 'Зберегти',
      saved: '✓ Збережено',
      keyHintPrefix: 'Отримати ключ:',
      usage: 'AI використовується для: аудитор ризиків · правовий попап · автоматичне визначення проводок · асистент · моніторинг законодавства',
      loadError: 'Помилка завантаження — перевірте API ключ',
    },
    integrations: {
      intro: 'Як це працює:',
      introText: 'підключіть інтеграції один раз — і з розділу "Документи" зможете відправляти декларації однією кнопкою. Кожен користувач налаштовує свої credentials.',
      napTitle: 'НАП API (НАПИ)',
      napDesc: 'Автоматична подача ДДС декларації та Образец 1 прямо з додатку',
      napConnected: '● Підключено',
      napDisconnected: '○ Не підключено',
      napApiKey: 'API ключ НАПИ',
      napOrg: 'ЄІК організації (для API)',
      napCheck: 'Перевірити зʼєднання',
      napLink: 'Реєстрація на napi.bg →',
      emailTitle: 'Email відправка',
      emailDesc: 'Відправка Образец 1 та інших форм на email НАП напряму з додатку',
      emailConnected: '● Підключено',
      emailDisconnected: '○ Не підключено',
      resend: 'Resend (рекомендовано)',
      smtp: 'SMTP',
      sender: 'Ваш email (відправник)',
      resendKey: 'Resend API ключ',
      resendHint: 'Безкоштовно до 3 000 листів/міс ·',
      saveCheck: 'Зберегти і перевірити',
      pikTitle: 'ПІК код НАП',
      pikDesc: 'Персональний ідентифікаційний код для порталу НАП. Альтернатива КЕП для фізичних осіб.',
      pikSaved: '● Збережено',
      pikMissing: '○ Не вказано',
      pikLabel: 'ПІК код',
      pikWarn: '⚠ КЕП ми не зберігаємо — це апаратний токен, який завжди у вас. ПІК — програмний код для онлайн-порталу НАП.',
      pikSave: 'Зберегти',
      pikLink: 'Портал НАП →',
    },
    system: {
      title: 'Система',
      resetTitle: 'Повторити онбординг',
      resetHint: 'Скинути майстер початкового налаштування',
      resetBtn: 'Скинути онбординг',
      versionTitle: 'Версія додатку',
      versionText: 'TaxBG Pro · Болгарське податкове право 2026 · EUR',
      dataTitle: 'Дані',
      dataText: 'Усі дані зберігаються локально у браузері (localStorage). Синхронізація між пристроями — через Supabase (у розробці).',
    },
    commonSave: 'Запази',
    commonSaved: '✓ Запазено',
  },
  en: {
    title: 'Settings',
    tabs: { profile: 'Profile', ai: 'AI model', integrations: 'Integrations', system: 'System' },
    profile: {
      lang: 'Interface language',
      legal: 'Legal form',
      company: 'Company',
      companyName: 'Company name',
      eik: 'EIK / Bulstat',
      period: 'Period (YYYY-MM)',
      vat: 'VAT registration',
      vatHint: 'Threshold: 51,130 €/year',
    },
    legalForms: {
      ood: { label: 'OOD / EOOD', desc: 'Legal entity · CIT 10% · dividends 5%' },
      et: { label: 'ET', desc: 'Sole trader · PIT 10%' },
      self: { label: 'Self-employed', desc: 'Freelancer · PIT 10% · flat expense 25%' },
    },
    ai: {
      title: 'AI model · OpenRouter',
      apiKey: 'OpenRouter API key',
      model: 'Model',
      list: 'List',
      loading: '...',
      save: 'Save',
      saved: '✓ Saved',
      keyHintPrefix: 'Get key:',
      usage: 'AI is used for: risk auditor · legal popup · automatic journal mapping · assistant · legal monitoring',
      loadError: 'Loading error — check API key',
    },
    integrations: {
      intro: 'How it works:',
      introText: 'connect integrations once and send declarations with one click from the "Documents" section. Each user configures their own credentials.',
      napTitle: 'NAP API (NAPI)',
      napDesc: 'Automatic VAT declaration and Form 1 submission directly from the app',
      napConnected: '● Connected',
      napDisconnected: '○ Not connected',
      napApiKey: 'NAPI API key',
      napOrg: 'Organization EIK (for API)',
      napCheck: 'Check connection',
      napLink: 'Register at napi.bg →',
      emailTitle: 'Email sending',
      emailDesc: 'Send Form 1 and other forms to NAP email directly from the app',
      emailConnected: '● Connected',
      emailDisconnected: '○ Not connected',
      resend: 'Resend (recommended)',
      smtp: 'SMTP',
      sender: 'Sender email',
      resendKey: 'Resend API key',
      resendHint: 'Free up to 3,000 emails/month ·',
      saveCheck: 'Save and test',
      pikTitle: 'NAP PIK code',
      pikDesc: 'Personal identification code for NAP portal. Alternative to QES for individuals.',
      pikSaved: '● Saved',
      pikMissing: '○ Not set',
      pikLabel: 'PIK code',
      pikWarn: '⚠ We do not store QES — it is a hardware token that always stays with you. PIK is a software code for the NAP portal.',
      pikSave: 'Save',
      pikLink: 'NAP portal →',
    },
    system: {
      title: 'System',
      resetTitle: 'Repeat onboarding',
      resetHint: 'Reset initial setup wizard',
      resetBtn: 'Reset onboarding',
      versionTitle: 'App version',
      versionText: 'TaxBG Pro · Bulgarian Tax Law 2026 · EUR',
      dataTitle: 'Data',
      dataText: 'All data is stored locally in browser localStorage. Cross-device sync via Supabase is in progress.',
    },
    commonSave: 'Save',
    commonSaved: '✓ Saved',
  },
  bg: {
    title: 'Настройки',
    tabs: { profile: 'Профил', ai: 'AI модел', integrations: 'Интеграции', system: 'Система' },
    profile: {
      lang: 'Език на интерфейса',
      legal: 'Правна форма',
      company: 'Компания',
      companyName: 'Име на компания',
      eik: 'ЕИК / Булстат',
      period: 'Период (YYYY-MM)',
      vat: 'ДДС регистрация',
      vatHint: 'Праг: 51 130 €/година',
    },
    legalForms: {
      ood: { label: 'ООД / ЕООД', desc: 'Юридическо лице · КНП 10% · дивиденти 5%' },
      et: { label: 'ЕТ', desc: 'Едноличен търговец · ДДФЛ 10%' },
      self: { label: 'Самоосигуряващ се', desc: 'Фрийлансър · ДДФЛ 10% · нормативни разходи 25%' },
    },
    ai: {
      title: 'AI модел · OpenRouter',
      apiKey: 'OpenRouter API ключ',
      model: 'Модел',
      list: 'Списък',
      loading: '...',
      save: 'Запази',
      saved: '✓ Запазено',
      keyHintPrefix: 'Вземи ключ:',
      usage: 'AI се използва за: одитор на риска · правен попъп · автоматично определяне на проводки · асистент · мониторинг на законодателството',
      loadError: 'Грешка при зареждане — проверете API ключа',
    },
    integrations: {
      intro: 'Как работи:',
      introText: 'свържете интеграциите веднъж и от секция "Документи" ще изпращате декларации с един бутон. Всеки потребител настройва свои credentials.',
      napTitle: 'НАП API (НАПИ)',
      napDesc: 'Автоматично подаване на ДДС декларация и Образец 1 директно от приложението',
      napConnected: '● Свързано',
      napDisconnected: '○ Не е свързано',
      napApiKey: 'НАПИ API ключ',
      napOrg: 'ЕИК на организацията (за API)',
      napCheck: 'Провери връзката',
      napLink: 'Регистрация в napi.bg →',
      emailTitle: 'Изпращане по Email',
      emailDesc: 'Изпращане на Образец 1 и други форми към email на НАП директно от приложението',
      emailConnected: '● Свързано',
      emailDisconnected: '○ Не е свързано',
      resend: 'Resend (препоръчително)',
      smtp: 'SMTP',
      sender: 'Вашият email (подател)',
      resendKey: 'Resend API ключ',
      resendHint: 'Безплатно до 3 000 писма/месец ·',
      saveCheck: 'Запази и провери',
      pikTitle: 'ПИК код НАП',
      pikDesc: 'Персонален идентификационен код за портала на НАП. Алтернатива на КЕП за физически лица.',
      pikSaved: '● Запазен',
      pikMissing: '○ Не е въведен',
      pikLabel: 'ПИК код',
      pikWarn: '⚠ Не съхраняваме КЕП — това е хардуерен токен, който остава при вас. ПИК е софтуерен код за онлайн портала на НАП.',
      pikSave: 'Запази',
      pikLink: 'Портал НАП →',
    },
    system: {
      title: 'Система',
      resetTitle: 'Повтори онбординга',
      resetHint: 'Нулира първоначалния съветник за настройка',
      resetBtn: 'Нулирай онбординг',
      versionTitle: 'Версия на приложението',
      versionText: 'TaxBG Pro · Българско данъчно право 2026 · EUR',
      dataTitle: 'Данни',
      dataText: 'Всички данни се съхраняват локално в браузъра (localStorage). Синхронизация между устройства чрез Supabase е в разработка.',
    },
    commonSave: 'Запази',
    commonSaved: '✓ Запазено',
  },
} as const

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
  const ui = UI[store.language]
  const t = useT()

  const audit = getAuditSummary()

  const [tab, setTab] = useState<SettingsTab>('profile')
  const [saved, setSaved] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [models, setModels] = useState<string[]>([])
  const [modelError, setModelError] = useState<string | null>(null)

  const legalForms = LEGAL_FORM_VALUES.map((value) => ({
    value,
    label: ui.legalForms[value].label,
    desc: ui.legalForms[value].desc,
  }))

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'profile',      label: t('tab_profile')      },
    { id: 'ai',           label: t('tab_ai')           },
    { id: 'integrations', label: t('tab_integrations') },
    { id: 'system',       label: t('tab_system')       },
  ]

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
      setModelError(ui.ai.loadError)
    } finally {
      setLoadingModels(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 pt-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-card)' }}>
        <h1 className="mb-3 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {t('page_settings')}
        </h1>
        <div className="flex gap-1">
          {tabs.map((t) => (
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
                  {t('label_language')}
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
                  {t('label_legal_form')}
                </h2>
                <div className="space-y-2">
                  {legalForms.map((form) => (
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
                  {ui.profile.company}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: ui.profile.companyName, value: store.companyName, set: store.setCompanyName, placeholder: 'Acme OOD' },
                    { label: ui.profile.eik, value: store.eik, set: store.setEik, placeholder: '123456789' },
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
                      {ui.profile.period}
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
                        {ui.profile.vat}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {ui.profile.vatHint}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: 'var(--accent)' }} onClick={handleSave}>
                {saved ? t('btn_saved') : t('btn_save')}
              </button>
            </>
          )}

          {tab === 'ai' && (
            <div style={cardStyle} className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {ui.ai.title}
              </h2>

              <div>
                <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {ui.ai.apiKey}
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
                  {ui.ai.keyHintPrefix} <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="underline" style={{ color: 'var(--accent)' }}>openrouter.ai/keys</a>
                </p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Ключ хранится только в вашем браузере.
                  Никуда не передаётся кроме запросов к OpenRouter.
                  В Pro подписке ключ не требуется.
                </p>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {ui.ai.model}
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
                  {loadingModels ? ui.ai.loading : ui.ai.list}
                </button>
              </div>

              {modelError && <p className="text-xs" style={{ color: 'var(--danger)' }}>{modelError}</p>}

              <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {ui.ai.usage}
                </p>
              </div>

              <button className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: 'var(--accent)' }} onClick={handleSave}>
                {saved ? ui.ai.saved : ui.ai.save}
              </button>
            </div>
          )}

          {tab === 'integrations' && (
            <div className="space-y-5">
              <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
                <p className="text-sm" style={{ color: 'var(--accent-text)' }}>
                  <strong>{ui.integrations.intro}</strong> {ui.integrations.introText}
                </p>
              </div>

              <div style={cardStyle} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{ui.integrations.napTitle}</h3>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {ui.integrations.napDesc}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                    integrations.napApi.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {integrations.napApi.status === 'connected' ? ui.integrations.napConnected : ui.integrations.napDisconnected}
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>{ui.integrations.napApiKey}</label>
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
                    <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>{ui.integrations.napOrg}</label>
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
                    {ui.integrations.napCheck}
                  </button>
                  <a href="https://napi.bg" target="_blank" rel="noreferrer" className="text-xs underline" style={{ color: 'var(--accent)' }}>
                    {ui.integrations.napLink}
                  </a>
                </div>
              </div>

              <div style={cardStyle} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{ui.integrations.emailTitle}</h3>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {ui.integrations.emailDesc}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                    integrations.email.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {integrations.email.status === 'connected' ? ui.integrations.emailConnected : ui.integrations.emailDisconnected}
                  </span>
                </div>

                <div className="flex gap-2">
                  {[
                    { id: true, label: ui.integrations.resend },
                    { id: false, label: ui.integrations.smtp },
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
                    <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>{ui.integrations.sender}</label>
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
                      <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>{ui.integrations.resendKey}</label>
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
                        {ui.integrations.resendHint} <a href="https://resend.com" target="_blank" rel="noreferrer" className="underline" style={{ color: 'var(--accent)' }}>resend.com</a>
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
                  {ui.integrations.saveCheck}
                </button>
              </div>

              <div style={cardStyle} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{ui.integrations.pikTitle}</h3>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {ui.integrations.pikDesc}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                    integrations.pik.status === 'saved' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {integrations.pik.status === 'saved' ? ui.integrations.pikSaved : ui.integrations.pikMissing}
                  </span>
                </div>

                <div>
                  <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>{ui.integrations.pikLabel}</label>
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
                    {ui.integrations.pikWarn}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => integrations.setPik({ status: 'saved' })}
                    disabled={!integrations.pik.pikCode}
                    className="rounded-xl px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    {ui.integrations.pikSave}
                  </button>
                  <a href="https://inetdec.nra.bg" target="_blank" rel="noreferrer" className="text-xs underline" style={{ color: 'var(--accent)' }}>
                    {ui.integrations.pikLink}
                  </a>
                </div>
              </div>
            </div>
          )}

          {tab === 'system' && (
            <div className="space-y-4">
              <div style={cardStyle} className="space-y-3">
                {/* ── TAX RATES AUDIT ──────────────────────────── */}
                <div>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}>
                    Актуальность налоговых ставок
                  </h2>

                  {/* Summary badge */}
                  <div className="flex items-center gap-3 mb-3 rounded-xl px-4 py-3"
                    style={{
                      backgroundColor: audit.hasCritical
                        ? 'var(--danger-light)' : 'var(--accent-light)',
                      border: `1px solid ${audit.hasCritical
                        ? 'var(--danger)' : 'var(--accent)'}`,
                    }}>
                    <span className="text-lg">
                      {audit.hasCritical ? '⛔' : audit.needs_review > 0 ? '🔔' : '✅'}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold"
                        style={{ color: audit.hasCritical
                          ? 'var(--danger)' : 'var(--accent-text)' }}>
                        {audit.hasCritical
                          ? `Требует внимания: ${audit.mismatch + audit.overdue} ставок`
                          : audit.needs_review > 0
                            ? `${audit.needs_review} ставок требуют проверки скоро`
                            : `Все ${audit.total} ставок актуальны`}
                      </p>
                      <p className="text-xs mt-0.5"
                        style={{ color: 'var(--text-muted)' }}>
                        {audit.ok} актуальных · {audit.overdue} просрочено ·{' '}
                        {audit.needs_review} скоро · {audit.mismatch} несовпадений
                      </p>
                    </div>
                  </div>

                  {/* Rate table */}
                  <div className="rounded-xl overflow-hidden"
                    style={{ border: '1px solid var(--border)' }}>
                    {audit.results.map((r) => (
                      <div key={r.item.id}
                        className="flex items-center justify-between px-4 py-2.5
                                   border-b last:border-0"
                        style={{
                          borderColor: 'var(--border)',
                          backgroundColor:
                            r.status === 'mismatch' ? 'var(--danger-light)'
                            : r.status === 'overdue' ? '#fffbeb'
                            : 'var(--surface-card)',
                        }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs">
                              {r.status === 'mismatch' ? '⛔'
                               : r.status === 'overdue' ? '⚠️'
                               : r.status === 'needs_review' ? '🔔'
                               : '✓'}
                            </span>
                            <p className="text-xs font-medium"
                              style={{ color: 'var(--text-primary)' }}>
                              {r.item.name}
                            </p>
                          </div>
                          <p className="text-xs mt-0.5 ml-5"
                            style={{ color: 'var(--text-muted)' }}>
                            {r.item.legalSource} · {r.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <span className="text-sm font-bold"
                            style={{ color:
                              r.status === 'mismatch' || r.status === 'overdue'
                                ? 'var(--danger)'
                                : r.status === 'needs_review'
                                  ? '#d97706'
                                  : 'var(--accent)' }}>
                            {r.item.currentValue}{r.item.unit}
                          </span>
                          <a href={r.item.officialUrl}
                            target="_blank" rel="noreferrer"
                            className="text-xs"
                            style={{ color: 'var(--accent)' }}
                            title="Проверить в официальном источнике">
                            ↗
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Instructions */}
                  <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    При изменении закона: обновите{' '}
                    <code className="px-1 rounded"
                      style={{ backgroundColor: 'var(--surface)',
                               color: 'var(--text-primary)' }}>
                      tax-rates-2026.ts
                    </code>{' '}
                    и{' '}
                    <code className="px-1 rounded"
                      style={{ backgroundColor: 'var(--surface)',
                               color: 'var(--text-primary)' }}>
                      taxRatesAudit.ts
                    </code>
                    {' '}→ см. TAX_RATES_CHANGELOG.md
                  </p>
                </div>
                {/* ── END TAX RATES AUDIT ──────────────────────── */}

                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{ui.system.title}</h2>

                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{ui.system.resetTitle}</p>
                  <p className="mb-2 mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {ui.system.resetHint}
                  </p>
                  <button
                    onClick={() => store.setOnboardingDone(false)}
                    className="rounded-xl border px-4 py-2 text-sm"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  >
                    {ui.system.resetBtn}
                  </button>
                </div>

                <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{ui.system.versionTitle}</p>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {ui.system.versionText}
                  </p>
                </div>

                <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                  <p className="mb-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{ui.system.dataTitle}</p>
                  <p className="mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {ui.system.dataText}
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
