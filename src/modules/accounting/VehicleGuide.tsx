import { useState } from 'react'

const RULES = [
  {
    icon: '🚗',
    title: 'Покупка автомобиля на ООД',
    text: 'Автомобиль — это основное средство (актив), а не расход. Вносите тип "Покупка ОС". В расходы идёт только амортизация.',
  },
  {
    icon: '📉',
    title: 'Амортизация 25% в год',
    text: 'По ЗКПО для автотранспорта — 25% годовых. Купили авто за 20 000 € — ежегодный расход 5 000 €. Вносите тип "Амортизация" раз в год.',
  },
  {
    icon: '⛽',
    title: 'Топливо, страховка, сервис',
    text: 'Если авто используется и в личных целях — признаётся только 50% расходов (ЗКПО чл. 204). Только служебный — 100%. Указывайте при добавлении транзакции.',
  },
  {
    icon: '🏛️',
    title: 'Налог на МПС — в общину, не в НАП',
    text: 'Муниципальный налог на автомобиль начисляется общиной по месту регистрации фирмы. Квитанция приходит по почте в январе-феврале. Платить онлайн на сайте общины.',
  },
  {
    icon: '📋',
    title: 'Иностранец без ПМЖ — только на фирму',
    text: 'Гражданин не-ЕС без постоянного вида на жительство не может зарегистрировать авто как физлицо. Регистрация через ООД — единственный вариант получить обычные белые номера.',
  },
]

export default function VehicleGuide() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span>🚗</span>
          <span className="text-sm font-medium text-amber-800">
            Автомобиль на ООД — как правильно учитывать
          </span>
        </div>
        <span className="text-amber-400 text-lg">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="border-t border-amber-100 px-4 pb-4 pt-3 space-y-3">
          {RULES.map((rule) => (
            <div key={rule.title} className="flex gap-3">
              <span className="text-base shrink-0">{rule.icon}</span>
              <div>
                <p className="text-sm font-medium text-amber-900">{rule.title}</p>
                <p className="text-xs text-amber-700 mt-0.5">{rule.text}</p>
              </div>
            </div>
          ))}
          <p className="text-xs text-amber-600 border-t border-amber-100 pt-3">
            Источник: ЗКПО чл. 55, чл. 204 · Закон за местните данъци и такси
          </p>
        </div>
      )}
    </div>
  )
}
