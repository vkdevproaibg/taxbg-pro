import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useCompaniesStore } from '../../store/companiesStore'
import { startCheckout, isStripeConfigured } from '../../lib/stripe'
import type { PaywallReason } from '../../hooks/usePaywall'

const REASON_META: Record<PaywallReason, {
  icon: string
  title: string
  description: string
}> = {
  add_transaction: {
    icon: '📊',
    title: 'Добавление транзакций — функция Pro',
    description:
      'В бесплатном плане вы можете просматривать данные. ' +
      'Для ввода транзакций нужен Pro план.',
  },
  add_employee: {
    icon: '👥',
    title: 'Управление сотрудниками — функция Pro',
    description:
      'Добавление и редактирование сотрудников ' +
      'доступно в Pro плане.',
  },
  add_company: {
    icon: '🏢',
    title: 'Создание компаний — функция Pro',
    description:
      'Бесплатный план позволяет просматривать данные. ' +
      'Для добавления компаний нужен Pro.',
  },
  export_data: {
    icon: '📤',
    title: 'Экспорт данных — функция Pro',
    description: 'Выгрузка в CSV и PDF доступна в Pro плане.',
  },
  ai_assistant: {
    icon: '🤖',
    title: 'AI Ассистент — функция Pro',
    description:
      'Налоговый AI консультант доступен в Pro плане. ' +
      'В бесплатном плане вы можете изучать статьи законов.',
  },
  lesson_locked: {
    icon: '🎓',
    title: 'Урок доступен в Pro',
    description:
      'Первые 3 урока бесплатны. ' +
      'Полный учебный центр — в Pro плане.',
  },
}

const PRO_FEATURES = [
  'Неограниченный ввод транзакций',
  'Все отчёты и декларации',
  'AI налоговый консультант',
  'Полный учебный центр',
  'Экспорт в CSV и PDF',
  'Синхронизация на всех устройствах',
]

interface Props {
  reason: PaywallReason
  onClose: () => void
}

export default function PaywallModal({ reason, onClose }: Props) {
  const { isDemo, session } = useAuthStore()
  const navigate = useNavigate()
  const activeCompanyId = useCompaniesStore((s) => s.activeCompanyId)

  // Authenticated flow — Stripe checkout
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  // Demo/unauthenticated flow — waitlist
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const meta = REASON_META[reason]

  const handleSubscribe = async () => {
    if (!session?.access_token || !activeCompanyId) return
    setCheckoutLoading(true)
    setCheckoutError(null)
    const { error } = await startCheckout(activeCompanyId, session.access_token)
    if (error) {
      setCheckoutError(error)
      setCheckoutLoading(false)
    }
    // On success startCheckout redirects — no further state update needed
  }

  const handleWaitlist = () => {
    if (!email) return
    const waitlist: string[] = JSON.parse(
      localStorage.getItem('taxbg-pro-waitlist') || '[]'
    )
    if (!waitlist.includes(email)) {
      waitlist.push(email)
      localStorage.setItem('taxbg-pro-waitlist', JSON.stringify(waitlist))
    }
    setSubmitted(true)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Header */}
        <div
          className="px-6 pt-6 pb-4 text-center"
          style={{ backgroundColor: 'var(--accent-light)' }}
        >
          <span className="text-4xl">{meta.icon}</span>
          <h2
            className="mt-3 text-base font-semibold"
            style={{ color: 'var(--accent-text)' }}
          >
            {meta.title}
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--accent-text)' }}>
            {meta.description}
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Pro features list */}
          <div className="space-y-2">
            {PRO_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2">
                <span style={{ color: 'var(--accent)' }}>✓</span>
                <span
                  className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {f}
                </span>
              </div>
            ))}
          </div>

          {/* CTA — depends on auth state */}
          {!isDemo ? (
            /* Authenticated user → Stripe Checkout (or stub) */
            <div className="space-y-2">
              {isStripeConfigured() ? (
                <>
                  <button
                    onClick={handleSubscribe}
                    disabled={checkoutLoading || !activeCompanyId}
                    className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    {checkoutLoading ? 'Открываем оплату...' : '💎 Оформить Pro подписку'}
                  </button>

                  {checkoutError && (
                    <p className="text-xs text-center" style={{ color: 'var(--danger)' }}>
                      {checkoutError}
                    </p>
                  )}

                  {!activeCompanyId && (
                    <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                      Сначала создайте компанию
                    </p>
                  )}
                </>
              ) : (
                /* TODO (июнь 2026): подключить Stripe после регистрации юр. лица.
                   Промт с инструкциями: docs/stripe-setup-prompt.md */
                <div
                  className="rounded-xl px-4 py-3 text-center space-y-1"
                  style={{
                    border: '1.5px dashed var(--border)',
                    backgroundColor: 'var(--surface)',
                  }}
                >
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    💳 Оплата будет доступна в июне 2026
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    После регистрации юр. лица подключим Stripe
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Demo / unauthenticated → waitlist + login */
            !submitted ? (
              <div className="space-y-3">
                <div>
                  <p
                    className="text-xs mb-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Pro подписка скоро. Оставьте email —
                    сообщим первыми о запуске:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleWaitlist()}
                      placeholder="your@email.com"
                      className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                      style={{
                        border: '1.5px solid var(--border)',
                        backgroundColor: 'var(--surface)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <button
                      onClick={handleWaitlist}
                      disabled={!email}
                      className="rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      style={{ backgroundColor: 'var(--accent)' }}
                    >
                      →
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => { onClose(); navigate('/auth') }}
                  className="w-full rounded-xl py-2 text-sm font-medium"
                  style={{
                    border: '1.5px solid var(--accent)',
                    color: 'var(--accent)',
                  }}
                >
                  Войти в аккаунт
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-2xl">🎉</p>
                <p
                  className="mt-2 text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Вы в списке!
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Сообщим на {email} когда Pro будет доступен.
                </p>
              </div>
            )
          )}

          <button
            onClick={onClose}
            className="w-full rounded-xl py-2 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
