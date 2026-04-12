import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useUserStore } from '../../store/userStore'
import type { AppLanguage } from '../../store/userStore'
import { initAnalytics, setAnalyticsEnabled } from '../../lib/analytics'

const STORAGE_KEY = 'taxbg-cookie-consent'

type CookieConsent = {
  necessary: true
  analytics: boolean
  acceptedAt: string
  version: number
}

const UI: Record<AppLanguage, {
  message: string
  learnMore: string
  accept: string
  settings: string
  close: string
  categoriesTitle: string
  necessary: string
  necessaryDesc: string
  alwaysOn: string
  analytics: string
  analyticsDesc: string
  analyticsDisabled: string
  saveAndClose: string
}> = {
  ru: {
    message: 'Этот сайт использует cookies для обеспечения работы аутентификации и сохранения настроек. Подробнее — в Политике конфиденциальности.',
    learnMore: 'Политика конфиденциальности',
    accept: 'Принять',
    settings: 'Настройки',
    close: '✕',
    categoriesTitle: 'Категории cookies',
    necessary: 'Необходимые (аутентификация, сессия)',
    necessaryDesc: 'Нужны для работы входа, безопасности и сохранения настроек.',
    alwaysOn: 'Всегда включены',
    analytics: 'Аналитические',
    analyticsDesc: 'Анонимная статистика использования. Данные не передаются третьим сторонам.',
    analyticsDisabled: 'Не используется',
    saveAndClose: 'Сохранить',
  },
  uk: {
    message: 'Цей сайт використовує cookies для автентифікації та збереження налаштувань. Детальніше — у Політиці конфіденційності.',
    learnMore: 'Політика конфіденційності',
    accept: 'Прийняти',
    settings: 'Налаштування',
    close: '✕',
    categoriesTitle: 'Категорії cookies',
    necessary: 'Необхідні (автентифікація, сесія)',
    necessaryDesc: 'Потрібні для входу, безпеки та збереження налаштувань.',
    alwaysOn: 'Завжди увімкнені',
    analytics: 'Аналітичні',
    analyticsDesc: 'Анонімна статистика використання. Дані не передаються третім сторонам.',
    analyticsDisabled: 'Не використовується',
    saveAndClose: 'Зберегти',
  },
  en: {
    message: 'This site uses cookies for authentication and to save your preferences. See the Privacy Policy for details.',
    learnMore: 'Privacy Policy',
    accept: 'Accept',
    settings: 'Settings',
    close: '✕',
    categoriesTitle: 'Cookie categories',
    necessary: 'Strictly necessary (auth, session)',
    necessaryDesc: 'Required for login, security and preference storage.',
    alwaysOn: 'Always on',
    analytics: 'Analytics',
    analyticsDesc: 'Anonymous usage statistics. Data is not shared with third parties.',
    analyticsDisabled: 'Not in use',
    saveAndClose: 'Save',
  },
  bg: {
    message: 'Този сайт използва бисквитки за автентикация и съхранение на настройки. Повече информация — в Политика за поверителност.',
    learnMore: 'Политика за поверителност',
    accept: 'Приемам',
    settings: 'Настройки',
    close: '✕',
    categoriesTitle: 'Категории бисквитки',
    necessary: 'Необходими (auth, session)',
    necessaryDesc: 'Нужни за вход, сигурност и съхранение на настройки.',
    alwaysOn: 'Винаги включени',
    analytics: 'Аналитични',
    analyticsDesc: 'Анонимна статистика за ползването. Данните не се споделят с трети страни.',
    analyticsDisabled: 'Не се използва',
    saveAndClose: 'Запази',
  },
}

async function writeAuditConsent(consent: CookieConsent) {
  if (!supabase) return
  const { isDemo, user } = useAuthStore.getState()
  if (isDemo || !user) return
  try {
    await supabase.from('audit_events').insert({
      actor_profile_id: user.id,
      entity_type: 'profile',
      action: 'cookie_consent_given',
      after_json: consent as unknown as Record<string, unknown>,
    })
  } catch (e) {
    console.warn('[cookie-banner] audit_events insert failed', e)
  }
}

export default function CookieBanner() {
  const language = useUserStore((s) => s.language)
  const ui = UI[language] ?? UI.ru

  const [visible, setVisible] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [analyticsChecked, setAnalyticsChecked] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  const accept = async () => {
    const consent: CookieConsent = {
      necessary: true,
      analytics: analyticsChecked,
      acceptedAt: new Date().toISOString(),
      version: 1,
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent))
      localStorage.setItem('taxbg-cookie-analytics', analyticsChecked ? 'true' : 'false')
    } catch (e) {
      console.warn('[cookie-banner] localStorage write failed', e)
    }
    // Start or stop analytics immediately
    if (analyticsChecked) {
      setAnalyticsEnabled(true)
      initAnalytics()
    } else {
      setAnalyticsEnabled(false)
    }
    setVisible(false)
    void writeAuditConsent(consent)
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4"
    >
      <div className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-sm text-slate-700 sm:pr-4">
            {ui.message}{' '}
            <Link to="/privacy" className="text-blue-600 underline hover:text-blue-700">
              {ui.learnMore}
            </Link>
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setDetailsOpen((v) => !v)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              {ui.settings}
            </button>
            <button
              type="button"
              onClick={accept}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              {ui.accept}
            </button>
          </div>
        </div>

        {detailsOpen && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {ui.categoriesTitle}
            </p>

            <label className="mt-3 flex items-start gap-3 rounded-md bg-slate-50 p-3">
              <input type="checkbox" checked disabled className="mt-0.5 h-4 w-4" />
              <span className="flex-1">
                <span className="block text-sm font-medium text-slate-800">{ui.necessary}</span>
                <span className="block text-xs text-slate-500">{ui.necessaryDesc}</span>
                <span className="mt-1 inline-block text-[11px] font-semibold text-emerald-700">
                  ● {ui.alwaysOn}
                </span>
              </span>
            </label>

            <label className="mt-2 flex items-start gap-3 rounded-md bg-slate-50 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={analyticsChecked}
                onChange={(e) => setAnalyticsChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span className="flex-1">
                <span className="block text-sm font-medium text-slate-800">{ui.analytics}</span>
                <span className="block text-xs text-slate-500">{ui.analyticsDesc}</span>
              </span>
            </label>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={accept}
                className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                {ui.saveAndClose}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
