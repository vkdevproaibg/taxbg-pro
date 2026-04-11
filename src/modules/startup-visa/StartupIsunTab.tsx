export default function StartupIsunTab() {
  return (
    <div className="space-y-5 p-6 max-w-2xl mx-auto">

      <div className="rounded-xl p-3 flex items-start gap-2"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <span className="text-sm shrink-0">ℹ️</span>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          С 2 января 2026 подача только через ISUN 2020.
          Старый портал СУНИ / NISM больше не используется для Startup Visa.
        </p>
      </div>

      <div className="rounded-xl p-4"
        style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--accent-text)' }}>
          Портал подачи заявки
        </p>
        <a href="https://enims.egov.bg/en" target="_blank" rel="noreferrer"
          className="text-sm font-bold underline" style={{ color: 'var(--accent)' }}>
          enims.egov.bg/en →
        </a>
        <p className="text-xs mt-1" style={{ color: 'var(--accent-text)' }}>
          Заявка подаётся на болгарском или английском языке.
          Обязателен КЕП. Услуга бесплатная.
        </p>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: 'var(--text-muted)' }}>
        Пошаговая инструкция
      </p>

      {[
        {
          n: '1',
          title: 'Подготовить КЕП',
          body: 'Для входа в ISUN 2020 нужен КЕП. '
            + 'Получается в B-Trust (btrust.bg) или Evrotrust (evrotrust.com). '
            + 'Стоимость ~50–100 €, срок 1–3 рабочих дня.',
          tip: 'Evrotrust выдаёт КЕП удалённо через приложение — '
            + 'оптимально если вы ещё не в Болгарии.',
          warn: null,
        },
        {
          n: '2',
          title: 'Зарегистрироваться в ISUN 2020',
          body: 'Зайдите на enims.egov.bg/en. Войдите через КЕП. '
            + 'Найдите раздел Startup Visa / Administrative service 3263.',
          tip: null,
          warn: 'Интерфейс на болгарском и английском. Используйте английскую версию.',
        },
        {
          n: '3',
          title: 'Заполнить форму заявки',
          body: 'Форма включает: личные данные заявителя, '
            + 'данные о компании (если уже зарегистрирована), '
            + 'описание проекта, финансовые прогнозы, '
            + 'рыночный анализ, информацию о команде.',
          tip: 'Описание инновации — ключевой блок. '
            + 'Формулируйте чётко: что нового, чем отличается от существующих решений.',
          warn: null,
        },
        {
          n: '4',
          title: 'Прикрепить документы',
          body: 'Все документы в PDF формате. '
            + 'Обязательные: копия паспорта, бизнес-план, '
            + 'банковская выписка (≥3 МЗП по актуальному размеру — '
            + 'на апрель 2026: 3 × 620.20 € = 1 860.60 €). '
            + 'Остальные — по применимости.',
          tip: 'Называйте файлы понятно: BusinessPlan_EN.pdf, BankStatement.pdf и т.д.',
          warn: null,
        },
        {
          n: '5',
          title: 'Подписать и отправить заявку КЕП',
          body: 'Заявка подписывается КЕП прямо в ISUN 2020. '
            + 'После отправки — входящий номер. Сохраните его.',
          tip: null,
          warn: 'Если документы неполные — '
            + '14 дней на исправление, затем новый 30-дневный '
            + 'срок рассмотрения. Если не исправите — мотивированный отказ.',
        },
        {
          n: '6',
          title: 'Получить решение — до 30 дней',
          body: 'Экспертный совет МИР оценивает заявку. '
            + 'Минимум 8 баллов из 14 для одобрения. '
            + 'При одобрении — сертификат отправляется почтой, '
            + 'курьером или электронно. '
            + 'Решение публикуется в течение 7 дней после издания.',
          tip: 'При отказе — можно обжаловать по Кодексу административного производства (КАП).',
          warn: null,
        },
      ].map(item => (
        <div key={item.n} className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}>
          <div className="flex items-start gap-3 px-4 py-3"
            style={{ backgroundColor: 'var(--surface-card)' }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
              style={{ backgroundColor: 'var(--accent)' }}>
              {item.n}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {item.title}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                {item.body}
              </p>
              {item.tip && (
                <p className="text-xs mt-1.5" style={{ color: 'var(--accent-text)' }}>
                  💡 {item.tip}
                </p>
              )}
              {item.warn && (
                <p className="text-xs mt-1.5 font-medium" style={{ color: '#92400e' }}>
                  ⚠ {item.warn}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Scoring */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--text-muted)' }}>
          Критерии оценки (максимум 14 баллов, нужно ≥8)
        </p>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {[
            {
              c: 'Финансовые средства заявителя',
              m: 'до 3 б.',
              n: 'Банковская выписка ≥3 МЗП за последние 30 дней',
            },
            {
              c: 'Финансовые прогнозы на 3 года',
              m: 'до 3 б.',
              n: 'Помесячно: выручка, затраты, чистая прибыль, прогноз роста',
            },
            {
              c: 'Рыночный анализ',
              m: 'до 2 б.',
              n: 'Целевые рынки, конкуренты, потенциал',
            },
            {
              c: 'Клиентская база (продажи ≥100k BGN / 2 года)',
              m: 'до 1 б.',
              n: 'Подтверждается договорами и банковскими выписками',
            },
            {
              c: 'Команда и компетенции',
              m: 'до 2 б.',
              n: 'Образование и опыт в области проекта',
            },
            {
              c: 'Инвестиции / патент / публикации',
              m: 'до 3 б.',
              n: 'Инвест. договор ≥100k BGN, патент ЕС/США/ОЭСР или 2+ публикации Q1/Q2 Scopus/WoS',
            },
          ].map((row, i) => (
            <div key={i}
              className="flex items-start gap-3 px-4 py-3 border-b last:border-0"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-card)' }}>
              <span className="text-xs font-bold shrink-0 w-14 text-right"
                style={{ color: 'var(--accent)' }}>
                {row.m}
              </span>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  {row.c}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {row.n}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
