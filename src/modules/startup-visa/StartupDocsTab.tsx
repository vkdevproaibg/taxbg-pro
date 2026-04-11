import { useState } from 'react'

interface DocItem {
  id: string
  name: string
  required: boolean
  note: string
}

interface DocStage {
  stage: string
  items: DocItem[]
}

const DOCS: DocStage[] = [
  {
    stage: 'Этап 1 — Сертификат МИР (ISUN 2020)',
    items: [
      {
        id: 'mir-1', required: true,
        name: 'Копия паспорта (страница с фото и данными)',
        note: 'PDF, цветная копия',
      },
      {
        id: 'mir-2', required: true,
        name: 'Бизнес-план проекта',
        note: 'На болгарском или английском. '
          + 'Обязательно: описание инновации, '
          + 'финансовый прогноз на 3 года помесячно, '
          + 'рыночный анализ, команда.',
      },
      {
        id: 'mir-3', required: true,
        name: 'Банковская выписка (≥3 МЗП)',
        note: 'На апрель 2026: 3 × 620.20 € = 1 860.60 €. За последние 30 дней до подачи.',
      },
      {
        id: 'mir-4', required: true,
        name: 'Финансовые прогнозы на 3 года',
        note: 'Помесячно: выручка, прямые затраты, операционные расходы, чистая прибыль. С прогнозом роста.',
      },
      {
        id: 'mir-5', required: false,
        name: 'Инвестиционный договор (≥100k BGN)',
        note: 'Опционально. Добавляет до 3 баллов. Письмо о намерениях от фонда тоже принимается.',
      },
      {
        id: 'mir-6', required: false,
        name: 'Патент или свидетельство полезной модели',
        note: 'Опционально. ЕС, США или страны ОЭСР.',
      },
      {
        id: 'mir-7', required: false,
        name: 'Seal of Excellence (Horizon 2020 / Horizon Europe)',
        note: 'Опционально. При наличии оценки ЕК.',
      },
      {
        id: 'mir-8', required: false,
        name: 'Научные публикации Q1/Q2 (Scopus / Web of Science)',
        note: 'Минимум 2 статьи. Опционально.',
      },
      {
        id: 'mir-9', required: false,
        name: 'Дипломы об образовании',
        note: 'Опционально. Профильное образование добавляет баллы.',
      },
      {
        id: 'mir-10', required: false,
        name: 'Партнёрские соглашения с болгарскими компаниями',
        note: 'Опционально. Letters of intent тоже принимаются.',
      },
    ],
  },
  {
    stage: 'Этап 2 — Виза D в консульстве',
    items: [
      {
        id: 'visa-1', required: true,
        name: 'Сертификат МИР (Startup Visa certificate)',
        note: 'Оригинал + копия. Действителен 1 год.',
      },
      {
        id: 'visa-2', required: true,
        name: 'Визовая анкета (бланк МИД Болгарии)',
        note: 'Заполнить, распечатать, подписать лично в 3 местах. '
          + 'Имя/фамилия — латиницей, остальное — на русском. '
          + 'Скачать: вкладка "Анкета визы D".',
      },
      {
        id: 'visa-3', required: true,
        name: 'Загранпаспорт',
        note: 'Срок действия: ориентир МИД — ≥18 месяцев от подачи. '
          + 'Минимум 2 чистые страницы. Оригинал + копия всех заполненных страниц.',
      },
      {
        id: 'visa-4', required: true,
        name: '2 цветные фотографии 3,5 × 4,5 см',
        note: 'Светлый фон. Без очков. Актуальный внешний вид.',
      },
      {
        id: 'visa-5', required: true,
        name: 'Документ о регистрации болгарской компании',
        note: 'Решение БРРА о регистрации ООД (ЕИК). Нотариальная копия + перевод.',
      },
      {
        id: 'visa-6', required: true,
        name: 'Документ о наличии жилья в Болгарии',
        note: 'Договор аренды (нотариально заверенный) + декларация собственника, '
          + 'или нотариальный акт на недвижимость.',
      },
      {
        id: 'visa-7', required: true,
        name: 'Банковская выписка (болгарский счёт ≥6 МЗП)',
        note: 'На апрель 2026: 6 × 620.20 € = 3 721.20 €. Оригинал + копия.',
      },
      {
        id: 'visa-8', required: true,
        name: 'Медицинская страховка',
        note: 'Покрытие ≥30 000 €. На весь период действия визы.',
      },
      {
        id: 'visa-9', required: true,
        name: 'Справка о несудимости',
        note: 'Из страны гражданства + апостиль + нотариальный перевод на болгарский. '
          + 'Из РФ: МФЦ (~10 дней) + Минюст апостиль (~7 дней) + перевод (~1 день).',
      },
      {
        id: 'visa-10', required: true,
        name: 'Консульский сбор',
        note: '100 € (ЗЧРБ ст.15 п.1). Оплачивается при подаче.',
      },
    ],
  },
]

export default function StartupDocsTab() {
  const [checked, setChecked] = useState<string[]>([])

  const toggle = (id: string) =>
    setChecked(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )

  const allRequired = DOCS.flatMap(s => s.items).filter(i => i.required)
  const checkedRequired = allRequired.filter(i => checked.includes(i.id)).length

  return (
    <div className="space-y-5 p-6 max-w-2xl mx-auto">

      {/* Progress */}
      <div className="rounded-xl p-4"
        style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Прогресс — обязательные документы
          </p>
          <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
            {checkedRequired} / {allRequired.length}
          </span>
        </div>
        <div className="h-2 rounded-full" style={{ backgroundColor: 'var(--border)' }}>
          <div className="h-2 rounded-full transition-all"
            style={{
              width: `${(checkedRequired / allRequired.length) * 100}%`,
              backgroundColor: 'var(--accent)',
            }} />
        </div>
      </div>

      {DOCS.map(stage => (
        <div key={stage.stage}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'var(--text-muted)' }}>
            {stage.stage}
          </p>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {stage.items.map(item => {
              const done = checked.includes(item.id)
              return (
                <div key={item.id}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:opacity-80 border-b last:border-0"
                  style={{
                    borderColor: 'var(--border)',
                    backgroundColor: done ? 'var(--accent-light)' : 'var(--surface-card)',
                  }}
                  onClick={() => toggle(item.id)}>
                  <div className="w-5 h-5 rounded shrink-0 mt-0.5 flex items-center justify-center"
                    style={{
                      border: done ? 'none'
                        : `1.5px solid ${item.required ? 'var(--danger)' : 'var(--border-strong)'}`,
                      backgroundColor: done ? 'var(--accent)' : 'transparent',
                    }}>
                    {done && <span className="text-white text-xs">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-medium ${done ? 'line-through' : ''}`}
                        style={{ color: done ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                        {item.name}
                      </p>
                      {!done && (
                        <span className="rounded-full px-1.5 py-0.5 text-xs"
                          style={{
                            backgroundColor: item.required ? 'var(--danger-light)' : 'var(--surface)',
                            color: item.required ? 'var(--danger)' : 'var(--text-muted)',
                          }}>
                          {item.required ? 'Обязательно' : 'Опционально'}
                        </span>
                      )}
                    </div>
                    {!done && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {item.note}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
