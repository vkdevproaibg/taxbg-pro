import { useState } from 'react'

const FACTS = [
  {
    icon: '📊',
    title: 'НСИ — самый забываемый отчёт',
    text: 'Годовой статистический отчёт в НСИ (nsi.bg) — до 31 марта каждого года. Большинство новых ООД получают штраф именно за него, потому что не знают о нём. Нужен КЕП.',
  },
  {
    icon: '🔑',
    title: 'КЕП — квалифицированная электронная подпись',
    text: 'Обязательна для подачи всех онлайн-отчётов (НАП, НСИ, БРРА). Выдаётся в B-Trust (btrust.bg) или Evrotrust. Срок 1–3 года, цена ~50–100 €. Без неё — только лично.',
  },
  {
    icon: '📝',
    title: 'ГФО в Агенция по вписванията (БРРА)',
    text: 'Годовой финансовый отчёт публикуется на brra.bg. Срок — до 30 июня для малых ООД. Подаётся с КЕП или через лицензированного счетоводителя.',
  },
  {
    icon: '📅',
    title: 'ДДС декларация — до 14-го числа',
    text: 'Ежемесячно, даже при нулевом обороте. Нулевая декларация тоже обязательна. Штраф за пропуск до 5 000 €.',
  },
  {
    icon: '🏦',
    title: 'Осигуровки — до 25-го числа',
    text: 'За каждого сотрудника и за себя (самоосигуряващ). Пени 0.03% в день. Подаются через портал НАП с КЕП или через счетоводителя.',
  },
]

export default function DeadlineGuide() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span>📋</span>
          <span className="text-sm font-medium text-blue-800">
            Что и куда сдавать — полный список обязательств ООД
          </span>
        </div>
        <span className="text-blue-400 text-lg">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="border-t border-blue-100 px-4 pb-4 pt-3 space-y-3">
          {FACTS.map(fact => (
            <div key={fact.title} className="flex gap-3">
              <span className="text-base shrink-0">{fact.icon}</span>
              <div>
                <p className="text-sm font-medium text-blue-900">{fact.title}</p>
                <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">{fact.text}</p>
              </div>
            </div>
          ))}
          <p className="text-xs text-blue-600 border-t border-blue-100 pt-3">
            Источники: ЗСТАТИСТИКАТА · ЗДДС · КСО · Закон за търговския регистър
          </p>
        </div>
      )}
    </div>
  )
}
