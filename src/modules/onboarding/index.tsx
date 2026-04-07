import { useState } from 'react'
import { useUserStore } from '../../store/userStore'
import type { LegalForm } from '../../store/userStore'

const LEGAL_FORMS: { value: LegalForm; label: string; desc: string; icon: string }[] = [
  { value: 'ood', icon: '🏢', label: 'ООД / ЕООД', desc: 'Юрлицо · корпоративен данък 10% · дивиденти 7%' },
  { value: 'et', icon: '🧾', label: 'ЕТ (едноличен търговец)', desc: 'ИП · ДДФЛ 10% · нормативни разходи 15%' },
  { value: 'self', icon: '💻', label: 'Самоосигуряващ се', desc: 'Фрилансер · ДДФЛ 10% · нормативни разходи 25%' },
]

const STEPS = ['Добре дошли', 'Правна форма', 'За фирмата', 'ДДС и служители', 'Готово']

export default function Onboarding() {
  const store = useUserStore()
  const [step, setStep] = useState(0)
  const [legalForm, setLegalForm] = useState<LegalForm>('ood')
  const [companyName, setCompanyName] = useState('')
  const [eik, setEik] = useState('')
  const [hasVat, setHasVat] = useState(false)
  const [hasEmployees, setHasEmployees] = useState(false)

  const finish = () => {
    store.setLegalForm(legalForm)
    store.setCompanyName(companyName)
    store.setEik(eik)
    store.setHasVat(hasVat)
    store.setHasEmployees(hasEmployees)
    store.setOnboardingDone(true)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="flex gap-2 mb-8">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all ${i <= step ? 'bg-violet-500 w-8' : 'bg-slate-200 w-4'}`}
          />
        ))}
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {step === 0 && (
          <div className="text-center space-y-4">
            <div className="text-5xl mb-2">🇧🇬</div>
            <h1 className="text-2xl font-bold text-slate-800">TaxBG Pro</h1>
            <p className="text-slate-500 leading-relaxed">
              Помогаем IT предпринимателям вести учёт в Болгарии самостоятельно —
              без бухгалтера, на русском языке.
            </p>
            <div className="space-y-2 text-sm text-left bg-slate-50 rounded-xl p-4">
              {[
                '✓ Декларации ДДС и ЗКПО с авто-заполнением',
                '✓ Все налоговые дедлайны с напоминаниями',
                '✓ Калькуляторы налогов и зарплат',
                '✓ Импорт из App Store и Google Play',
                '✓ AI-ассистент по болгарскому налоговому праву',
              ].map(f => (
                <p key={f} className="text-slate-600">{f}</p>
              ))}
            </div>
            <button
              onClick={() => setStep(1)}
              className="w-full rounded-xl bg-violet-600 py-3 font-medium text-white hover:bg-violet-700"
            >
              Начать настройку →
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Правна форма</h2>
            <p className="text-sm text-slate-500">Выберите форму вашего бизнеса в Болгарии</p>
            <div className="space-y-2">
              {LEGAL_FORMS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setLegalForm(f.value)}
                  className={`w-full flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                    legalForm === f.value ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-2xl">{f.icon}</span>
                  <div>
                    <div className={`font-medium ${legalForm === f.value ? 'text-violet-700' : 'text-slate-800'}`}>
                      {f.label}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{f.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Данни за фирмата</h2>
            <p className="text-sm text-slate-500">Используются для автозаполнения деклараций</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Название компании</label>
                <input
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Acme ЕООД"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-violet-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">ЕИК / Булстат</label>
                <input
                  value={eik}
                  onChange={e => setEik(e.target.value)}
                  placeholder="123456789"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-violet-400 focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Найти ЕИК:{' '}
                  <a href="https://portal.registryagency.bg" target="_blank" rel="noreferrer" className="text-violet-500 underline">
                    portal.registryagency.bg
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">ДДС и служители</h2>
            <p className="text-sm text-slate-500">Влияет на состав обязательных деклараций</p>

            <div className="space-y-3">
              <div
                className={`flex items-start gap-4 rounded-xl border p-4 cursor-pointer transition-colors ${
                  hasVat ? 'border-violet-400 bg-violet-50' : 'border-slate-200'
                }`}
                onClick={() => setHasVat(!hasVat)}
              >
                <div
                  className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${
                    hasVat ? 'border-violet-500 bg-violet-500' : 'border-slate-300'
                  }`}
                >
                  {hasVat && <span className="text-white text-xs">✓</span>}
                </div>
                <div>
                  <div className="font-medium text-slate-700">Регистриран по ДДС</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Обязательно при обороте {'>'} 51 130 €/год · ежемесячная декларация до 14-го
                  </div>
                </div>
              </div>

              <div
                className={`flex items-start gap-4 rounded-xl border p-4 cursor-pointer transition-colors ${
                  hasEmployees ? 'border-violet-400 bg-violet-50' : 'border-slate-200'
                }`}
                onClick={() => setHasEmployees(!hasEmployees)}
              >
                <div
                  className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${
                    hasEmployees ? 'border-violet-500 bg-violet-500' : 'border-slate-300'
                  }`}
                >
                  {hasEmployees && <span className="text-white text-xs">✓</span>}
                </div>
                <div>
                  <div className="font-medium text-slate-700">Има служители</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Ежемесячная подача Образец 1 · осигуровки до 25-го числа
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-2">✅</div>
              <h2 className="text-xl font-semibold">Всё готово!</h2>
              <p className="text-sm text-slate-500 mt-1">Настройки сохранены. Можно начинать.</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
              {[
                ['Правна форма', LEGAL_FORMS.find(f => f.value === legalForm)?.label],
                ['Компания', companyName || '—'],
                ['ЕИК', eik || '—'],
                ['ДДС регистрация', hasVat ? 'Да' : 'Не'],
                ['Служители', hasEmployees ? 'Да' : 'Не'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step > 0 && (
          <div className="flex gap-3 mt-6">
            {step > 0 && step < 4 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                ← Назад
              </button>
            )}
            {step < 4 && (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
              >
                Напред →
              </button>
            )}
            {step === 4 && (
              <button
                onClick={finish}
                className="w-full rounded-xl bg-violet-600 py-3 text-sm font-medium text-white hover:bg-violet-700"
              >
                Влез в приложението →
              </button>
            )}
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Настройки можно изменить в любой момент в разделе Настройки
      </p>
    </div>
  )
}
