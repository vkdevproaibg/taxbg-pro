// CURRENCY RULE B — state fee / fine from Bulgarian law (legacy BGN)
// The fee/fine is still defined in BGN in the official tariff/law.
// Auto-conversion applies per ЗВЕРБ. Show EUR equivalent in parentheses
// with a note that the official source is in BGN.
// Format: "18 € (35 лв. по тарифа на АВп)"

import { useState } from 'react'
import {
  REGISTRATION_FORMS,
  OOD_REGISTRATION_STEPS,
  REGISTRATION_TAX_INFO,
  REGISTRATION_WARNINGS,
  type RegistrationForm,
  type ChecklistItem,
} from '../../constants/lifecycle-events'
import ChecklistCard from './ChecklistCard'

export default function RegistrationTab() {
  const [selectedForm, setSelectedForm] =
    useState<RegistrationForm>('OOD')

  const form = REGISTRATION_FORMS.find(f => f.id === selectedForm)!

  return (
    <div className="space-y-5 p-6 max-w-2xl mx-auto">

      {/* Form selector */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--text-muted)' }}>
          Выберите форму ведения бизнеса
        </p>
        <div className="grid grid-cols-3 gap-2">
          {REGISTRATION_FORMS.map(f => (
            <button key={f.id}
              onClick={() => setSelectedForm(f.id)}
              className="rounded-xl p-3 text-center transition-all"
              style={{
                border: selectedForm === f.id
                  ? '2px solid var(--accent)'
                  : '1.5px solid var(--border)',
                backgroundColor: selectedForm === f.id
                  ? 'var(--accent-light)'
                  : 'var(--surface-card)',
              }}>
              <div className="text-2xl mb-1">{f.icon}</div>
              <div className="text-sm font-bold"
                style={{ color: selectedForm === f.id
                  ? 'var(--accent)' : 'var(--text-primary)' }}>
                {f.name}
              </div>
              <div className="text-xs mt-0.5"
                style={{ color: 'var(--text-muted)' }}>
                {f.founders.split('(')[0].trim().slice(0, 20)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected form details */}
      <div className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border)' }}>
        <div className="px-4 py-3"
          style={{ backgroundColor: 'var(--surface)' }}>
          <p className="text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}>
            {form.icon} {form.fullName} ({form.name})
          </p>
        </div>
        <div className="divide-y"
          style={{ borderColor: 'var(--border)' }}>
          {[
            ['Минимальный капитал', form.minCapital],
            ['Ответственность',    form.liability],
            ['Учредители',        form.founders],
            ['Налоги',            form.taxRate],
            ['Осигуровки',        form.socialBase],
            ['Лучше всего для',   form.bestFor],
          ].map(([label, value]) => (
            <div key={label}
              className="flex items-start gap-3 px-4 py-2.5"
              style={{ backgroundColor: 'var(--surface-card)' }}>
              <span className="text-xs shrink-0 w-36"
                style={{ color: 'var(--text-muted)' }}>
                {label}
              </span>
              <span className="text-xs font-medium"
                style={{ color: 'var(--text-primary)' }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Pros/Cons */}
        <div className="grid grid-cols-2 divide-x"
          style={{ borderTop: '1px solid var(--border)',
                   borderColor: 'var(--border)' }}>
          <div className="px-4 py-3"
            style={{ backgroundColor: 'var(--surface-card)' }}>
            <p className="text-xs font-semibold mb-2"
              style={{ color: 'var(--accent-text)' }}>
              ✓ Преимущества
            </p>
            {form.pros.map((p, i) => (
              <p key={i} className="text-xs mb-1"
                style={{ color: 'var(--text-secondary)' }}>
                · {p}
              </p>
            ))}
          </div>
          <div className="px-4 py-3"
            style={{ backgroundColor: 'var(--surface-card)' }}>
            <p className="text-xs font-semibold mb-2"
              style={{ color: '#92400e' }}>
              ✗ Ограничения
            </p>
            {form.cons.map((c, i) => (
              <p key={i} className="text-xs mb-1"
                style={{ color: 'var(--text-secondary)' }}>
                · {c}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Registration checklist — only for OOD */}
      {selectedForm === 'OOD' && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}>
            Пошаговая регистрация ООД / ЕООД
          </p>
          <ChecklistCard
            items={OOD_REGISTRATION_STEPS as unknown as ChecklistItem[]}
            title="Чеклист регистрации ООД" />
        </>
      )}

      {/* ET note */}
      {selectedForm === 'ET' && (
        <div className="rounded-xl p-4"
          style={{ backgroundColor: '#fffbeb',
                   border: '1px solid #f59e0b' }}>
          <p className="text-xs font-semibold mb-2"
            style={{ color: '#92400e' }}>
            ⚠️ ЕТ недоступен иностранцам без ПМЖ
          </p>
          <p className="text-xs leading-relaxed"
            style={{ color: '#92400e' }}>
            Едноличен търговец может зарегистрировать только
            болгарский гражданин или иностранец с разрешением
            за постоянно пребиваване (ПМЖ). Для иностранцев
            с ВНЖ (включая Startup Visa) — только ООД/ЕООД
            или самоосигуряващ се.
          </p>
          <p className="text-xs mt-2"
            style={{ color: '#92400e' }}>
            Шаги регистрации ЕТ аналогичны ООД, но проще:
            форма А1 в БРРА, без уставного капитала, без устава.
            Стоимость регистрации ~18 € (35 лв. по тарифа на АВп) онлайн.
          </p>
        </div>
      )}

      {/* SAMOO steps */}
      {selectedForm === 'SAMOO' && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}>
            Регистрация самоосигуряващ се
          </p>
          <div className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--accent-light)',
                     border: '1px solid var(--accent)' }}>
            <p className="text-xs font-semibold mb-2"
              style={{ color: 'var(--accent-text)' }}>
              💡 Самый быстрый способ начать работать в Болгарии
            </p>
            <p className="text-xs leading-relaxed"
              style={{ color: 'var(--accent-text)' }}>
              Не нужна регистрация в БРРА. Только заявление
              в НАП (форма ОКД-5) — подаётся онлайн с КЕП
              или лично. Доступно иностранцам с ВНЖ.
            </p>
          </div>
          {[
            {
              n: '1', title: 'Наличие ВНЖ в Болгарии',
              desc: 'Обязательное условие для иностранца. '
                + 'Карточка ВНЖ должна быть действующей.',
            },
            {
              n: '2', title: 'Подать ОКД-5 в НАП',
              desc: 'Заявление за регистрация като '
                + 'самоосигуряващо се лице. '
                + 'Онлайн через НАП портал с КЕП '
                + 'или лично в офис НАП.',
            },
            {
              n: '3', title: 'Выбрать осигурителна база',
              desc: 'Минимум — МЗП (620.20 €). '
                + 'Максимум — 3 МЗП (1 860.60 €). '
                + 'Осигуровки: ~32.7% от выбранной базы.',
            },
            {
              n: '4', title: 'Открыть счёт в болгарском банке',
              desc: 'Для получения оплаты и уплаты налогов.',
            },
            {
              n: '5', title: 'Декларировать доходы ежегодно',
              desc: 'Декларация по ЗДДФЛ (ГДД) — до 30 апреля '
                + 'следующего года. База = доход × 75% × 10%.',
            },
          ].map(step => (
            <div key={step.n}
              className="flex items-start gap-3 rounded-xl p-3"
              style={{ backgroundColor: 'var(--surface-card)',
                       border: '1px solid var(--border)' }}>
              <div className="w-6 h-6 rounded-full flex items-center
                              justify-center shrink-0 text-xs
                              font-bold text-white"
                style={{ backgroundColor: 'var(--accent)' }}>
                {step.n}
              </div>
              <div>
                <p className="text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}>
                  {step.title}
                </p>
                <p className="text-xs mt-0.5"
                  style={{ color: 'var(--text-muted)' }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tax info */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--text-muted)' }}>
          Налоги при {form.name}
        </p>
        <div className="space-y-2">
          {REGISTRATION_TAX_INFO
            .filter(t =>
              selectedForm === 'OOD'
                ? true
                : !t.title.includes('ЗКПО') &&
                  !t.title.includes('Дивиденды'))
            .map((t, i) => (
              <div key={i}
                className="rounded-xl p-3"
                style={{ backgroundColor: 'var(--surface-card)',
                         border: '1px solid var(--border)' }}>
                <div className="flex items-start
                                 justify-between gap-2">
                  <p className="text-sm font-medium"
                    style={{ color: 'var(--text-primary)' }}>
                    {t.title}
                  </p>
                  {'rate' in t && t.rate !== undefined && (
                    <span className="rounded-full px-2 py-0.5
                                      text-xs font-bold shrink-0"
                      style={{ backgroundColor: 'var(--accent-light)',
                               color: 'var(--accent)' }}>
                      {(t.rate * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <p className="text-xs mt-1"
                  style={{ color: 'var(--text-muted)' }}>
                  {t.description}
                </p>
                {'formula' in t && t.formula && (
                  <p className="text-xs mt-1 font-mono"
                    style={{ color: 'var(--accent)' }}>
                    {t.formula}
                  </p>
                )}
                <p className="text-xs mt-1"
                  style={{ color: 'var(--text-muted)' }}>
                  {t.legalBasis}
                </p>
              </div>
            ))}
        </div>
      </div>

      {/* Warnings */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: 'var(--text-muted)' }}>
          ⚠️ Важно знать
        </p>
        <div className="space-y-2">
          {REGISTRATION_WARNINGS.map((w, i) => (
            <div key={i}
              className="flex items-start gap-2 rounded-xl p-3"
              style={{ backgroundColor: '#fffbeb',
                       border: '1px solid #f59e0b' }}>
              <span className="text-xs shrink-0 mt-0.5">⚠️</span>
              <p className="text-xs"
                style={{ color: '#92400e' }}>{w}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Official links */}
      <div className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border)' }}>
        <div className="px-4 py-3"
          style={{ backgroundColor: 'var(--surface)' }}>
          <p className="text-sm font-medium"
            style={{ color: 'var(--text-primary)' }}>
            🔗 Официальные ресурсы
          </p>
        </div>
        <div className="divide-y"
          style={{ borderColor: 'var(--border)' }}>
          {[
            {
              label: 'БРРА — Портал за електронни услуги',
              url: 'https://portal.registryagency.bg',
              note: 'Регистрация, поиск компаний, форма А4',
            },
            {
              label: 'НАП — Регистрация самоосигуряващ се (ОКД-5)',
              url: 'https://nap.bg',
              note: 'Форма ОКД-5, ДДС регистрация',
            },
            {
              label: 'Търговски регистър — проверка названия',
              url: 'https://portal.registryagency.bg/CR/reports/VerificationApplication',
              note: 'Уникальность названия компании',
            },
          ].map((link, i) => (
            <a key={i} href={link.url}
              target="_blank" rel="noreferrer"
              className="flex items-start justify-between
                         px-4 py-3 hover:opacity-80"
              style={{ backgroundColor: 'var(--surface-card)' }}>
              <div>
                <p className="text-sm"
                  style={{ color: 'var(--accent)' }}>
                  {link.label}
                </p>
                <p className="text-xs"
                  style={{ color: 'var(--text-muted)' }}>
                  {link.note}
                </p>
              </div>
              <span className="text-xs shrink-0 ml-2"
                style={{ color: 'var(--text-muted)' }}>→</span>
            </a>
          ))}
        </div>
      </div>

      {/* Document package section */}
      {selectedForm === 'OOD' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}>
              📁 Пакет учредителни документи
            </p>
          </div>
          <div className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--accent-light)',
                     border: '1px solid var(--accent)' }}>
            <p className="text-xs mb-3" style={{ color: 'var(--accent-text)' }}>
              Попълнете данните и свалете готов пакет от 10 документа
              за БРРА, банка и НАП — учредителен акт, договор за
              управление, декларации, UBO и др.
            </p>
            <p className="text-xs font-medium"
              style={{ color: 'var(--accent-text)' }}>
              → Отидете на вкладката "📁 Документи" в менюто по-горе.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
