import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getAuditSummary } from '../lib/taxRatesAudit'
import { useUserStore } from '../store/userStore'
import { useIntegrationsStore } from '../store/integrationsStore'
import { usePurgeStore } from '../store/purgeStore'
import PurgeAccountModal from '../components/ui/PurgeAccountModal'
import type { AppLanguage, LegalForm } from '../store/userStore'
import { fetchOpenRouterModels } from '../lib/llmCatalog'
import { useT } from '../lib/useT'
import { useAuthStore } from '../store/authStore'
import { createLocalBackup, restoreLocalBackup } from '../lib/localBackup'

type SettingsTab = 'profile' | 'ai' | 'integrations' | 'system' | 'security'

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

// ---------------------------------------------------------------------------
// Security tab i18n
// ---------------------------------------------------------------------------
const SEC_UI = {
  ru: {
    tabLabel: 'Безопасность',
    loginMethod: 'Способ входа',
    emailLogin: 'Вход по email',
    googleLogin: (email: string) => `Вход через Google (${email})`,
    changePassword: 'Сменить пароль',
    currentPassword: 'Текущий пароль',
    newPassword: 'Новый пароль',
    confirmPassword: 'Подтвердите пароль',
    savePassword: 'Сохранить',
    savingPassword: 'Сохраняем…',
    passwordSaved: '✓ Пароль изменён',
    activeSessions: 'Активные сессии',
    currentSession: 'Текущая сессия',
    signOutAll: 'Выйти из всех устройств',
    signingOut: 'Выходим…',
    errShort: 'Пароль должен быть не менее 8 символов',
    errMismatch: 'Пароли не совпадают',
    errGeneric: 'Не удалось сменить пароль. Попробуйте ещё раз.',
    errVerify: 'Неверный текущий пароль.',
  },
  uk: {
    tabLabel: 'Безпека',
    loginMethod: 'Спосіб входу',
    emailLogin: 'Вхід по email',
    googleLogin: (email: string) => `Вхід через Google (${email})`,
    changePassword: 'Змінити пароль',
    currentPassword: 'Поточний пароль',
    newPassword: 'Новий пароль',
    confirmPassword: 'Підтвердіть пароль',
    savePassword: 'Зберегти',
    savingPassword: 'Зберігаємо…',
    passwordSaved: '✓ Пароль змінено',
    activeSessions: 'Активні сесії',
    currentSession: 'Поточна сесія',
    signOutAll: 'Вийти з усіх пристроїв',
    signingOut: 'Виходимо…',
    errShort: 'Пароль має бути не менше 8 символів',
    errMismatch: 'Паролі не збігаються',
    errGeneric: 'Не вдалося змінити пароль. Спробуйте ще раз.',
    errVerify: 'Невірний поточний пароль.',
  },
  en: {
    tabLabel: 'Security',
    loginMethod: 'Login method',
    emailLogin: 'Email login',
    googleLogin: (email: string) => `Google login (${email})`,
    changePassword: 'Change password',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    savePassword: 'Save',
    savingPassword: 'Saving…',
    passwordSaved: '✓ Password changed',
    activeSessions: 'Active sessions',
    currentSession: 'Current session',
    signOutAll: 'Sign out from all devices',
    signingOut: 'Signing out…',
    errShort: 'Password must be at least 8 characters',
    errMismatch: 'Passwords do not match',
    errGeneric: 'Could not change password. Please try again.',
    errVerify: 'Incorrect current password.',
  },
  bg: {
    tabLabel: 'Сигурност',
    loginMethod: 'Начин на вход',
    emailLogin: 'Вход с email',
    googleLogin: (email: string) => `Вход с Google (${email})`,
    changePassword: 'Смяна на парола',
    currentPassword: 'Текуща парола',
    newPassword: 'Нова парола',
    confirmPassword: 'Потвърдете паролата',
    savePassword: 'Запази',
    savingPassword: 'Запазваме…',
    passwordSaved: '✓ Паролата е сменена',
    activeSessions: 'Активни сесии',
    currentSession: 'Текуща сесия',
    signOutAll: 'Излез от всички устройства',
    signingOut: 'Излизаме…',
    errShort: 'Паролата трябва да е поне 8 символа',
    errMismatch: 'Паролите не съвпадат',
    errGeneric: 'Паролата не можа да се смени. Опитай отново.',
    errVerify: 'Невалидна текуща парола.',
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
  const isDemo = useAuthStore(s => s.isDemo)
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
    { id: 'security',     label: SEC_UI[store.language].tabLabel },
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

              <ViewModeSection />

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

          {tab === 'security' && (
            <SecurityTab />
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

                {isDemo && <BackupSection />}
              </div>
            </div>
          )}

          <LegalLinksSection />
          <PurgeAccountSection />
        </div>
      </div>
    </div>
  )
}

const VIEW_MODE_TEXTS = {
  ru: {
    title: 'Режим отображения',
    owner: 'Собственник',
    ownerDesc: 'Управленческий обзор: ключевые метрики, состояние отчётности, контроль работы бухгалтера. Скрывает технические разделы.',
    accountant: 'Бухгалтер',
    accountantDesc: 'Полный доступ: журнал, ОПР, баланс, НАП отчёты, все модули приложения.',
  },
  uk: {
    title: 'Режим відображення',
    owner: 'Власник',
    ownerDesc: 'Управлінський огляд: ключові метрики, стан звітності, контроль роботи бухгалтера. Приховує технічні розділи.',
    accountant: 'Бухгалтер',
    accountantDesc: 'Повний доступ: журнал, ОПР, баланс, звіти НАП, усі модулі застосунку.',
  },
  en: {
    title: 'Display mode',
    owner: 'Owner',
    ownerDesc: 'Management view: key metrics, reporting status, accountant oversight. Hides technical sections.',
    accountant: 'Accountant',
    accountantDesc: 'Full access: ledger, P&L, balance sheet, NAP reports, all app modules.',
  },
  bg: {
    title: 'Режим на преглед',
    owner: 'Собственик',
    ownerDesc: 'Управленски преглед: ключови метрики, статус на отчетността, контрол на счетоводителя. Скрива техническите раздели.',
    accountant: 'Счетоводител',
    accountantDesc: 'Пълен достъп: дневник, ОПР, баланс, отчети НАП, всички модули на приложението.',
  },
} as const

// ---------------------------------------------------------------------------
// Security tab component
// ---------------------------------------------------------------------------
function SecurityTab() {
  const [currentPwd,  setCurrentPwd]  = useState('')
  const [newPwd,      setNewPwd]      = useState('')
  const [confirmPwd,  setConfirmPwd]  = useState('')
  const [saving,      setSaving]      = useState(false)
  const [pwdSuccess,  setPwdSuccess]  = useState(false)
  const [pwdError,    setPwdError]    = useState<string | null>(null)
  const [signingOut,  setSigningOut]  = useState(false)

  const language       = useUserStore((s) => s.language)
  const updatePassword = useAuthStore((s) => s.updatePassword)
  const signOutFn      = useAuthStore((s) => s.signOut)
  const user           = useAuthStore((s) => s.user)
  const session        = useAuthStore((s) => s.session)
  const st = SEC_UI[language]

  const isGoogleUser = user?.app_metadata?.provider === 'google'
  const userEmail    = user?.email ?? ''

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdError(null)
    if (newPwd.length < 8) { setPwdError(st.errShort); return }
    if (newPwd !== confirmPwd) { setPwdError(st.errMismatch); return }

    setSaving(true)
    // Verify current password by re-signing in
    const { supabase: sb } = await import('../lib/supabase')
    if (sb) {
      const { error: verifyErr } = await sb.auth.signInWithPassword({ email: userEmail, password: currentPwd })
      if (verifyErr) { setSaving(false); setPwdError(st.errVerify); return }
    }
    const errMsg = await updatePassword(newPwd)
    setSaving(false)
    if (errMsg) {
      setPwdError(st.errGeneric)
    } else {
      setPwdSuccess(true)
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
      setTimeout(() => setPwdSuccess(false), 3000)
    }
  }

  const handleSignOutAll = async () => {
    setSigningOut(true)
    await signOutFn()
  }

  const signedInAt = session?.user?.last_sign_in_at
    ? new Date(session.user.last_sign_in_at).toLocaleString(language === 'bg' ? 'bg-BG' : language === 'uk' ? 'uk-UA' : language === 'en' ? 'en-US' : 'ru-RU')
    : null

  return (
    <div className="space-y-5">
      {/* Login method */}
      <div style={cardStyle}>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {st.loginMethod}
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
          {isGoogleUser ? st.googleLogin(userEmail) : `${st.emailLogin}: ${userEmail}`}
        </p>
      </div>

      {/* Change password — only for email users */}
      {!isGoogleUser && (
        <div style={cardStyle}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {st.changePassword}
          </h2>
          {pwdSuccess && (
            <div className="mb-3 rounded-xl px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-text)' }}>
              {st.passwordSaved}
            </div>
          )}
          <form onSubmit={handleChangePassword} noValidate className="space-y-3">
            <div>
              <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>{st.currentPassword}</label>
              <input
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>{st.newPassword}</label>
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
              <PasswordStrengthInline password={newPwd} lang={language} />
            </div>
            <div>
              <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>{st.confirmPassword}</label>
              <input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                style={{
                  ...inputStyle,
                  borderColor: confirmPwd && confirmPwd !== newPwd ? 'var(--danger)' : 'var(--border)',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
            {pwdError && (
              <div className="rounded-xl px-3 py-2 text-sm"
                style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger-text)' }}>
                {pwdError}
              </div>
            )}
            <button
              type="submit"
              disabled={saving || !currentPwd || !newPwd || !confirmPwd}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {saving ? st.savingPassword : st.savePassword}
            </button>
          </form>
        </div>
      )}

      {/* Active sessions */}
      <div style={cardStyle}>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {st.activeSessions}
        </h2>
        <div className="flex items-center justify-between rounded-xl p-3 mb-3"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {st.currentSession}
            </p>
            {signedInAt && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{signedInAt}</p>
            )}
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">●</span>
        </div>
        <button
          onClick={handleSignOutAll}
          disabled={signingOut}
          className="rounded-xl border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40"
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)', backgroundColor: 'transparent' }}
        >
          {signingOut ? st.signingOut : st.signOutAll}
        </button>
      </div>
    </div>
  )
}

// Inline password strength bar used inside SecurityTab
function PasswordStrengthInline({ password, lang }: { password: string; lang: AppLanguage }) {
  if (!password) return null
  const strength =
    password.length < 8 ? 1
    : /[^a-zA-Zа-яА-Я0-9]/.test(password) && /\d/.test(password) ? 3
    : /\d/.test(password) ? 2
    : 1
  const LABELS: Record<AppLanguage, [string, string, string]> = {
    ru: ['Слабый', 'Средний', 'Сильный'],
    uk: ['Слабкий', 'Середній', 'Сильний'],
    en: ['Weak', 'Medium', 'Strong'],
    bg: ['Слаба', 'Средна', 'Силна'],
  }
  const COLORS = ['#ef4444', '#f59e0b', '#22c55e']
  const idx = strength - 1
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-1 flex-1 rounded-full transition-colors"
            style={{ backgroundColor: i <= strength ? COLORS[idx] : 'var(--border)' }} />
        ))}
      </div>
      <p className="text-xs" style={{ color: COLORS[idx] }}>{LABELS[lang][idx]}</p>
    </div>
  )
}

function ViewModeSection() {
  const viewMode = useUserStore((s) => s.viewMode)
  const setViewMode = useUserStore((s) => s.setViewMode)
  const language = useUserStore((s) => s.language)
  const texts = VIEW_MODE_TEXTS[language] ?? VIEW_MODE_TEXTS.ru

  const options: { value: 'owner' | 'accountant'; label: string; desc: string }[] = [
    { value: 'owner',      label: texts.owner,      desc: texts.ownerDesc      },
    { value: 'accountant', label: texts.accountant, desc: texts.accountantDesc },
  ]

  return (
    <div style={cardStyle}>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {texts.title}
      </h2>
      <div className="space-y-2">
        {options.map((opt) => {
          const active = viewMode === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => setViewMode(opt.value)}
              className="w-full rounded-xl px-4 py-3 text-left transition-colors"
              style={{
                border: active ? '2px solid var(--accent)' : '2px solid var(--border)',
                backgroundColor: active ? 'var(--accent-light)' : 'var(--surface)',
              }}
            >
              <div className="text-sm font-medium" style={{ color: active ? 'var(--accent-text)' : 'var(--text-primary)' }}>
                {opt.label}
              </div>
              <div className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                {opt.desc}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const LEGAL_LINKS_TEXTS: Record<AppLanguage, {
  title: string
  privacy: string
  terms: string
  aiDisclosure: string
}> = {
  ru: { title: 'Правовая информация', privacy: 'Политика конфиденциальности', terms: 'Условия использования', aiDisclosure: 'AI Disclosure' },
  uk: { title: 'Правова інформація', privacy: 'Політика конфіденційності', terms: 'Умови використання', aiDisclosure: 'AI Disclosure' },
  en: { title: 'Legal information', privacy: 'Privacy Policy', terms: 'Terms of Service', aiDisclosure: 'AI Disclosure' },
  bg: { title: 'Правна информация', privacy: 'Политика за поверителност', terms: 'Общи условия', aiDisclosure: 'AI Disclosure' },
}

function LegalLinksSection() {
  const language = useUserStore((s) => s.language)
  const texts = LEGAL_LINKS_TEXTS[language] ?? LEGAL_LINKS_TEXTS.ru
  return (
    <div style={cardStyle}>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {texts.title}
      </h2>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link to="/privacy" className="text-blue-600 hover:underline">{texts.privacy}</Link>
        <Link to="/terms" className="text-blue-600 hover:underline">{texts.terms}</Link>
        <Link to="/ai-disclosure" className="text-blue-600 hover:underline">{texts.aiDisclosure}</Link>
      </div>
    </div>
  )
}

const PURGE_TEXTS: Record<AppLanguage, {
  title: string
  warning: string
  button: string
  existingTitle: string
  existingMessage: (date: string) => string
  cancelBtn: string
  cancelling: string
  cancelError: string
}> = {
  ru: {
    title: 'Удаление аккаунта',
    warning: '⚠ Удаление аккаунта необратимо. Все данные будут удалены через 90 дней после запроса. Скачайте архив документов ПЕРЕД удалением.',
    button: 'Запросить удаление аккаунта',
    existingTitle: 'Заявка на удаление активна',
    existingMessage: (d) => `Аккаунт будет удалён ${d}. Вы можете отменить заявку до этой даты.`,
    cancelBtn: 'Отменить заявку',
    cancelling: 'Отмена...',
    cancelError: 'Не удалось отменить.',
  },
  uk: {
    title: 'Видалення акаунта',
    warning: '⚠ Видалення акаунта незворотне. Усі дані будуть видалені через 90 днів після запиту. Завантажте архів документів ПЕРЕД видаленням.',
    button: 'Запитати видалення акаунта',
    existingTitle: 'Заявку на видалення подано',
    existingMessage: (d) => `Акаунт буде видалено ${d}. Ви можете скасувати заявку до цієї дати.`,
    cancelBtn: 'Скасувати заявку',
    cancelling: 'Скасування...',
    cancelError: 'Не вдалося скасувати.',
  },
  en: {
    title: 'Delete account',
    warning: '⚠ Account deletion is irreversible. All data will be deleted 90 days after the request. Download the document archive BEFORE deleting.',
    button: 'Request account deletion',
    existingTitle: 'Deletion request is active',
    existingMessage: (d) => `Account will be deleted on ${d}. You can cancel the request before that date.`,
    cancelBtn: 'Cancel request',
    cancelling: 'Cancelling...',
    cancelError: 'Failed to cancel.',
  },
  bg: {
    title: 'Изтриване на акаунт',
    warning: '⚠ Изтриването на акаунта е необратимо. Всички данни ще бъдат изтрити 90 дни след заявката. Свалете архива на документите ПРЕДИ изтриване.',
    button: 'Поискай изтриване на акаунт',
    existingTitle: 'Заявката за изтриване е активна',
    existingMessage: (d) => `Акаунтът ще бъде изтрит на ${d}. Можете да отмените заявката преди тази дата.`,
    cancelBtn: 'Отмени заявката',
    cancelling: 'Отменя се...',
    cancelError: 'Неуспешна отмяна.',
  },
}

const BACKUP_TEXTS = {
  ru: { title: 'Резервное копие', download: 'Скачать бэкап', restore: 'Восстановить из файла', restored: 'Восстановлено ключей', errors: 'Ошибок', selectFile: 'Выберите JSON файл' },
  uk: { title: 'Резервне копіювання', download: 'Завантажити бекап', restore: 'Відновити з файлу', restored: 'Відновлено ключів', errors: 'Помилок', selectFile: 'Оберіть JSON файл' },
  en: { title: 'Backup', download: 'Download backup', restore: 'Restore from file', restored: 'Keys restored', errors: 'Errors', selectFile: 'Select JSON file' },
  bg: { title: 'Резервно копие', download: 'Изтегли бекъп', restore: 'Възстанови от файл', restored: 'Възстановени ключове', errors: 'Грешки', selectFile: 'Изберете JSON файл' },
} as const

function BackupSection() {
  const language = useUserStore(s => s.language)
  const texts = BACKUP_TEXTS[language] ?? BACKUP_TEXTS.ru
  const fileRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<{ restored: number; errors: string[] } | null>(null)

  const handleDownload = () => {
    const json = createLocalBackup()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `taxbg-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const res = restoreLocalBackup(reader.result as string)
      setResult(res)
    }
    reader.readAsText(file)
  }

  return (
    <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {texts.title}
      </h2>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleDownload}
          className="rounded-xl border px-4 py-2 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          {texts.download}
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-xl border px-4 py-2 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          {texts.restore}
        </button>
        <input ref={fileRef} type="file" accept=".json" onChange={handleRestore} className="hidden" />
      </div>
      {result && (
        <p className="mt-2 text-xs" style={{ color: result.errors.length > 0 ? '#dc2626' : 'var(--accent)' }}>
          {texts.restored}: {result.restored}. {texts.errors}: {result.errors.length}
        </p>
      )}
    </div>
  )
}

function PurgeAccountSection() {
  const language = useUserStore((s) => s.language)
  const purgeRequestedAt = usePurgeStore((s) => s.purgeRequestedAt)
  const purgeScheduledAt = usePurgeStore((s) => s.purgeScheduledAt)
  const cancelPurge = usePurgeStore((s) => s.cancelPurge)
  const texts = PURGE_TEXTS[language] ?? PURGE_TEXTS.ru
  const [modalOpen, setModalOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const handleCancel = async () => {
    setCancelling(true)
    setCancelError(null)
    const err = await cancelPurge()
    setCancelling(false)
    if (err) setCancelError(texts.cancelError)
  }

  const formatDate = (iso: string) => {
    const locale = language === 'bg' ? 'bg-BG' : language === 'uk' ? 'uk-UA' : language === 'en' ? 'en-GB' : 'ru-RU'
    try { return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }) }
    catch { return iso.slice(0, 10) }
  }

  return (
    <>
      <div style={{ ...cardStyle, border: '2px solid #fca5a5' }}>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-red-700">
          {texts.title}
        </h2>

        {purgeRequestedAt && purgeScheduledAt ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-red-800">{texts.existingTitle}</p>
            <p className="text-sm text-red-700">{texts.existingMessage(formatDate(purgeScheduledAt))}</p>
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="rounded-xl border border-red-400 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              {cancelling ? texts.cancelling : texts.cancelBtn}
            </button>
            {cancelError && <p className="text-xs text-red-600">{cancelError}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-900">
              {texts.warning}
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              {texts.button}
            </button>
          </div>
        )}
      </div>

      <PurgeAccountModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
