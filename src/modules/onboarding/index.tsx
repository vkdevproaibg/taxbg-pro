import { useState } from 'react'
import { useUserStore } from '../../store/userStore'
import type { LegalForm } from '../../store/userStore'
import { useT } from '../../lib/useT'
import { useEntryAuditStore } from '../../store/entryAuditStore'
import type { EntryPath } from '../../store/entryAuditStore'
import EntryAuditWizard from '../entry-audit/EntryAuditWizard'
import { useAuthStore } from '../../store/authStore'
import { useCompaniesStore } from '../../store/companiesStore'

const LEGAL_FORMS: { value: LegalForm; label: string; desc: string; icon: string }[] = [
  { value: 'ood',  icon: '🏢', label: 'ООД / ЕООД',             desc: 'Юрлицо · КНП 10% · дивиденти 5%' },
  { value: 'et',   icon: '🧾', label: 'ЕТ (едноличен търговец)', desc: 'ИП · ДДФЛ 10% · норм. разходи 15%' },
  { value: 'self', icon: '💻', label: 'Самоосигуряващ се',        desc: 'Фрилансер · ДДФЛ 10% · норм. разходи 25%' },
]

const STEPS = ['Добре дошли', 'Правна форма', 'За фирмата', 'ДДС и служители', 'Готово']

export default function Onboarding() {
  const t = useT()
  const store = useUserStore()
  const { path, setPath } = useEntryAuditStore()
  const { isDemo, user } = useAuthStore()
  const { addCompany, setActive, initFromSupabase } = useCompaniesStore()

  const [step,         setStep]         = useState(0)
  const [legalForm,    setLegalForm]    = useState<LegalForm>('ood')
  const [companyName,  setCompanyName]  = useState('')
  const [eik,          setEik]          = useState('')
  const [hasVat,       setHasVat]       = useState(false)
  const [hasEmployees, setHasEmployees] = useState(false)
  const [showAudit,    setShowAudit]    = useState(false)
  const [saving,       setSaving]       = useState(false)

  const finish = async () => {
    setSaving(true)
    try {
      // Always save to userStore (settings fallback)
      store.setLegalForm(legalForm)
      store.setCompanyName(companyName)
      store.setEik(eik)
      store.setHasVat(hasVat)
      store.setHasEmployees(hasEmployees)

      const companyData = {
        name:         companyName || 'Моя компания',
        eik:          eik || '',
        legalForm,
        hasVat,
        hasEmployees,
        country:      'BG',
        currency:     'EUR',
        taxResidency: 'BG',
        isOffshore:   false,
        notes:        '',
        color:        '#00966E',
      }

      if (!isDemo && user) {
        // Authenticated — addCompany syncs to Supabase automatically
        const companyId = addCompany(companyData)
        setActive(companyId)
        // Reload from Supabase to confirm sync and populate store
        await initFromSupabase(user.id)
      } else {
        // Demo mode — localStorage only
        const companyId = addCompany(companyData)
        setActive(companyId)
      }

      if (path === 'existing' || path === 'closing') {
        setShowAudit(true)
      } else {
        store.setOnboardingDone(true)
      }
    } finally {
      setSaving(false)
    }
  }

  if (showAudit) {
    return (
      <EntryAuditWizard
        onComplete={() => {
          setShowAudit(false)
          store.setOnboardingDone(true)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-folk-pattern flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: 'var(--surface)' }}>

      {/* Flag stripe */}
      <div className="fixed top-0 left-0 right-0 h-3 bg-flag-stripe" />

      {/* Progress dots */}
      <div className="flex gap-2 mb-8">
        {STEPS.map((_, i) => (
          <div key={i}
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: i <= step ? 32 : 16,
              backgroundColor: i <= step ? 'var(--accent)' : 'var(--border-strong)',
            }} />
        ))}
      </div>

      <div className="w-full max-w-md rounded-2xl shadow-lg overflow-hidden"
        style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>

        {/* Step header stripe */}
        <div className="h-2 bg-flag-stripe" />

        <div className="p-8">

          {/* Step 0: Path selector (shown first), then Welcome */}
          {step === 0 && !path && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-5xl mb-4">🌹</div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  TaxBG Pro
                </h1>
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                  Расскажите о вашей ситуации
                </p>
              </div>
              {([
                { path: 'new'      as EntryPath, icon: '🌱', title: 'Только начинаю',       desc: 'Регистрирую компанию или только переехал в Болгарию' },
                { path: 'existing' as EntryPath, icon: '🏢', title: 'Компания уже работает', desc: 'Бизнес идёт, нужно навести порядок в учёте' },
                { path: 'closing'  as EntryPath, icon: '📦', title: 'Закрываю бизнес',       desc: 'Нужно закрыть все обязательства перед ликвидацией' },
              ]).map((option) => (
                <button key={option.path}
                  onClick={() => setPath(option.path)}
                  className="w-full rounded-xl p-4 text-left transition-all hover:opacity-90"
                  style={{ backgroundColor: 'var(--surface-card)', border: '1.5px solid var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{option.icon}</span>
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {option.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {option.desc}
                      </p>
                    </div>
                    <span className="ml-auto text-lg" style={{ color: 'var(--text-muted)' }}>›</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 0: Welcome (after path selected) */}
          {step === 0 && path && (
            <div className="text-center space-y-4">
              <div className="text-6xl mb-2">🌹</div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                TaxBG Pro
              </h1>
              <p style={{ color: 'var(--text-secondary)' }} className="leading-relaxed">
                {t('onboarding_welcome_subtitle')}
              </p>
              <div className="rounded-xl p-4 space-y-2 text-sm text-left"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                {[
                  '✓ Декларации ДДС и ЗКПО с авто-заполнением',
                  '✓ Все налоговые дедлайны с напоминаниями',
                  '✓ Калькуляторы налогов и зарплат',
                  '✓ Импорт из App Store и Google Play',
                  '✓ AI-аудитор по болгарскому налоговому праву',
                ].map((f) => (
                  <p key={f} style={{ color: 'var(--text-secondary)' }}>{f}</p>
                ))}
              </div>
              <button onClick={() => setStep(1)}
                className="w-full rounded-xl py-3 font-semibold text-white transition-colors"
                style={{ backgroundColor: 'var(--accent)' }}>
                {t('onboarding_start')}
              </button>
            </div>
          )}

          {/* Step 1: Legal form */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('onboarding_legal_form_title')}
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Выберите форму вашего бизнеса в Болгарии
              </p>
              <div className="space-y-2">
                {LEGAL_FORMS.map((f) => (
                  <button key={f.value} onClick={() => setLegalForm(f.value)}
                    className="w-full flex items-start gap-3 rounded-xl p-4 text-left transition-colors"
                    style={{
                      border: legalForm === f.value
                        ? '2px solid var(--accent)'
                        : '2px solid var(--border)',
                      backgroundColor: legalForm === f.value
                        ? 'var(--accent-light)'
                        : 'var(--surface)',
                    }}>
                    <span className="text-2xl">{f.icon}</span>
                    <div>
                      <div className="font-medium"
                        style={{ color: legalForm === f.value ? 'var(--accent-text)' : 'var(--text-primary)' }}>
                        {f.label}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {f.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Company */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('onboarding_company_title')}
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Используются для автозаполнения деклараций
              </p>
              <div className="space-y-3">
                {[
                  { label: 'Название компании', value: companyName, set: setCompanyName, placeholder: 'Acme ЕООД' },
                  { label: 'ЕИК / Булстат',    value: eik,         set: setEik,         placeholder: '123456789' },
                ].map(({ label, value, set, placeholder }) => (
                  <div key={label}>
                    <label className="mb-1 block text-sm font-medium"
                      style={{ color: 'var(--text-secondary)' }}>{label}</label>
                    <input value={value} onChange={(e) => set(e.target.value)}
                      placeholder={placeholder}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={{
                        border: '1.5px solid var(--border)',
                        backgroundColor: 'var(--surface)',
                        color: 'var(--text-primary)',
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    />
                  </div>
                ))}
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Найти ЕИК:{' '}
                  <a href="https://portal.registryagency.bg" target="_blank" rel="noreferrer"
                    style={{ color: 'var(--accent)' }} className="underline">
                    portal.registryagency.bg
                  </a>
                </p>
              </div>
            </div>
          )}

          {/* Step 3: VAT + employees */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('onboarding_vat_title')}
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Влияет на состав обязательных деклараций
              </p>
              <div className="space-y-3">
                {[
                  {
                    value: hasVat,
                    toggle: () => setHasVat(!hasVat),
                    title: 'Регистриран по ДДС',
                    desc: 'Обязательно при обороте > 51 130 €/год · ежемесячная декларация до 14-го',
                  },
                  {
                    value: hasEmployees,
                    toggle: () => setHasEmployees(!hasEmployees),
                    title: 'Има служители',
                    desc: 'Ежемесячная подача Образец 1 · осигуровки до 25-го числа',
                  },
                ].map(({ value, toggle, title, desc }) => (
                  <div key={title}
                    className="flex items-start gap-4 rounded-xl p-4 cursor-pointer transition-colors"
                    style={{
                      border: value ? '2px solid var(--accent)' : '2px solid var(--border)',
                      backgroundColor: value ? 'var(--accent-light)' : 'var(--surface)',
                    }}
                    onClick={toggle}>
                    <div className="mt-0.5 h-5 w-5 rounded flex items-center justify-center shrink-0 transition-colors"
                      style={{
                        border: `2px solid ${value ? 'var(--accent)' : 'var(--border-strong)'}`,
                        backgroundColor: value ? 'var(--accent)' : 'transparent',
                      }}>
                      {value && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div>
                      <div className="font-medium"
                        style={{ color: value ? 'var(--accent-text)' : 'var(--text-primary)' }}>
                        {title}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-5xl mb-2">✅</div>
                <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {t('onboarding_done_title')}
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  Добро пожаловать в TaxBG Pro 🌹
                </p>
              </div>
              <div className="rounded-xl p-4 space-y-2 text-sm"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                {[
                  ['Правна форма', LEGAL_FORMS.find((f) => f.value === legalForm)?.label],
                  ['Компания',     companyName || '—'],
                  ['ЕИК',          eik || '—'],
                  ['ДДС',          hasVat ? 'Да' : 'Не'],
                  ['Служители',    hasEmployees ? 'Да' : 'Не'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Disclaimer */}
              <div className="rounded-xl p-3"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  💡 TaxBG Pro — информационный помощник.
                  Система помогает вести учёт и контролировать дедлайны,
                  но не заменяет лицензированного счетоводителя
                  и не несёт юридической ответственности за
                  принятые решения.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          {step > 0 && (
            <div className="flex gap-3 mt-6">
              {step < 4 && (
                <button onClick={() => setStep((s) => s - 1)}
                  className="flex-1 rounded-xl py-2.5 text-sm transition-colors"
                  style={{
                    border: '1.5px solid var(--border)',
                    color: 'var(--text-secondary)',
                    backgroundColor: 'transparent',
                  }}>
                  {t('btn_back')}
                </button>
              )}
              {step < 4 && (
                <button onClick={() => setStep((s) => s + 1)}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
                  style={{ backgroundColor: 'var(--accent)' }}>
                  {t('btn_next')}
                </button>
              )}
              {step === 4 && (
                <button
                  onClick={() => { finish() }}
                  disabled={saving}
                  className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: 'var(--accent)' }}>
                  {saving ? 'Создаём компанию...' : t('onboarding_enter')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        {isDemo
          ? '🇧🇬 TaxBG Pro · Болгария 2026 · Данные хранятся локально'
          : '🇧🇬 TaxBG Pro · Болгария 2026 · Данные сохраняются в облаке'}
      </p>
    </div>
  )
}
