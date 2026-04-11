import { useState } from 'react'

const FACTS = [
  {
    icon: '📊',
    title: 'НСИ — забытый отчёт',
    text: 'Годовой статистический отчёт в НСИ (nsi.bg) — срок до 30 юни. Большинство новых ООД получают штраф именно за него. КЕП или ПИК.',
  },
  {
    icon: '📝',
    title: 'ГФО в Агенция по вписванията',
    text: 'Годовой финансовый отчёт публикуется на brra.bg — до 30 июня (ООД с малым оборотом) или 30 апреля (крупные). Штраф 500–2 000 €.',
  },
  {
    icon: '🔑',
    title: 'КЕП — квалифицированная электронная подпись',
    text: 'Нужна для подачи всех онлайн-отчётов. Выдаётся в B-Trust (btrust.bg) или Evrotrust. Срок действия 1–3 года. Стоимость ~50–100 €.',
  },
  {
    icon: '📅',
    title: 'Декларация ДДС — до 14-го числа',
    text: 'Ежемесячно, даже если оборот нулевой. Нулевая декларация тоже подаётся. Штраф за пропуск до 5 000 €.',
  },
  {
    icon: '🏦',
    title: 'Осигуровки — до 25-го числа',
    text: 'За каждого сотрудника и за себя (самоосигуряващ). Пени 0.03% в день от суммы.',
  },
]

export default function DeadlineGuide() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span>📅</span>
          <span className="text-sm font-medium text-violet-800">
            Дедлайны и отчётность: что не забыть
          </span>
        </div>
        <span className="text-lg text-violet-400">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-violet-100 px-4 pb-4 pt-3">
          {FACTS.map(fact => (
            <div key={fact.title} className="flex gap-3">
              <span className="shrink-0 text-base">{fact.icon}</span>
              <div>
                <p className="text-sm font-medium text-violet-900">{fact.title}</p>
                <p className="mt-0.5 text-xs text-violet-700">{fact.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
