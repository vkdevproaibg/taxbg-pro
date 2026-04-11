export default function StartupKepTab() {
  return (
    <div className="space-y-5 p-6 max-w-2xl mx-auto">

      <div className="rounded-xl p-4"
        style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          КЕП (квалифицированная электронная подпись) нужен
          для подачи заявки в ISUN 2020. Это юридически значимая
          подпись — аналог собственноручной. Для целей Startup Visa
          достаточно персонального КЕП физлица.
        </p>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: 'var(--text-muted)' }}>
        Где получить КЕП
      </p>

      {[
        {
          name: 'Evrotrust',
          url: 'https://evrotrust.com',
          pros: [
            'Полностью удалённо через приложение',
            'Работает для нерезидентов Болгарии',
            'iOS и Android',
          ],
          cons: [
            'Нужен биометрический загранпаспорт',
            'Подписание только через телефон',
          ],
          cost: '~50–60 € / год',
          time: '1–3 рабочих дня',
          remote: true,
        },
        {
          name: 'B-Trust',
          url: 'https://btrust.bg',
          pros: [
            'Признан всеми болгарскими госорганами',
            'Токен для ПК или облачная версия',
          ],
          cons: [
            'Личное присутствие или представитель в Болгарии',
            'Сложнее получить из-за рубежа',
          ],
          cost: '~60–100 € / год',
          time: '1–5 рабочих дней',
          remote: false,
        },
      ].map(p => (
        <div key={p.name} className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: 'var(--surface)' }}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {p.name}
              </span>
              {p.remote && (
                <span className="rounded-full px-2 py-0.5 text-xs"
                  style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                  ✓ Удалённо
                </span>
              )}
            </div>
            <a href={p.url} target="_blank" rel="noreferrer"
              className="text-xs underline" style={{ color: 'var(--accent)' }}>
              Сайт →
            </a>
          </div>
          <div className="px-4 py-3 space-y-2" style={{ backgroundColor: 'var(--surface-card)' }}>
            <div className="flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>💶 {p.cost}</span>
              <span>⏱ {p.time}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--accent-text)' }}>
                  ✓ Плюсы
                </p>
                {p.pros.map((item, i) => (
                  <p key={i} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    · {item}
                  </p>
                ))}
              </div>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: '#92400e' }}>
                  ✗ Ограничения
                </p>
                {p.cons.map((item, i) => (
                  <p key={i} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    · {item}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="rounded-xl p-4"
        style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent-text)' }}>
          💡 Совет для подающих из России / Украины
        </p>
        <p className="text-xs" style={{ color: 'var(--accent-text)' }}>
          Evrotrust — оптимален если вы ещё не в Болгарии.
          Установите приложение, пройдите верификацию через
          биометрический паспорт дистанционно.
          После получения сертификата МИР тот же КЕП используете
          для дальнейших взаимодействий с болгарскими госорганами.
        </p>
      </div>

      <div className="rounded-xl p-3"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          КЕП действует 1–3 года в зависимости от тарифа.
          Один КЕП работает для ISUN 2020, НАП, БРРА, НСИ
          и других болгарских государственных систем.
        </p>
      </div>
    </div>
  )
}
