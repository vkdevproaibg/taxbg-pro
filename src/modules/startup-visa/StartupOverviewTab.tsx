// CURRENCY RULE B — state fee / fine from Bulgarian law (legacy BGN)
// The fee/fine is still defined in BGN in the official tariff/law.
// Auto-conversion applies per ЗВЕРБ. Show EUR equivalent in parentheses
// with a note that the official source is in BGN.
// Format: "2.56 € (5 лв. по тарифа на МВнР)"

export default function StartupOverviewTab() {
  return (
    <div className="space-y-5 p-6 max-w-2xl mx-auto">

      {/* Disclaimer */}
      <div className="rounded-xl p-3 flex items-start gap-2"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <span className="text-sm shrink-0">ℹ️</span>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Информация актуальна на апрель 2026. С 2 января 2026 портал
          подачи изменился — теперь ISUN 2020, не СУНИ/NISM.
          Всегда проверяйте актуальные требования на mig.government.bg.
        </p>
      </div>

      {/* What is it */}
      <div className="rounded-xl p-4"
        style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Что такое Startup Visa
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Startup Visa — это не отдельный тип визы, а
          <strong> сертификат МИР Болгарии</strong>,
          подтверждающий инновационность или высокотехнологичность
          вашего проекта. Сертификат является одним из обязательных
          условий для получения визы D по этому основанию, а виза D —
          основанием для получения долгосрочного ВНЖ.
        </p>
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#92400e' }}>
            🔄 Важно понимать порядок
          </p>
          <p className="text-xs" style={{ color: '#92400e' }}>
            Сертификат МИР → виза D в консульстве → въезд в Болгарию →
            регистрация/владение ≥50% болгарской компании →
            подача на ВНЖ в Миграционна служба.
            Владение компанией — условие для продления сертификата
            и ВНЖ, не для получения первоначального сертификата.
          </p>
        </div>
      </div>

      {/* Full path */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--text-muted)' }}>
          Полный путь шаг за шагом
        </p>
        <div className="space-y-2">
          {[
            {
              n: '1',
              title: 'Получить КЕП (электронную подпись)',
              desc: 'Нужен для подачи заявки в ISUN 2020. '
                + 'B-Trust или Evrotrust. ~50–100 €, 1–3 дня. '
                + 'Evrotrust — удалённо из любой страны.',
            },
            {
              n: '2',
              title: 'Подготовить бизнес-план и пакет документов',
              desc: 'Ключевой документ — бизнес-план на болгарском '
                + 'или английском с финпрогнозом на 3 года. '
                + 'Минимум 8 баллов из 14 для одобрения.',
            },
            {
              n: '3',
              title: 'Подать заявку в ISUN 2020',
              desc: 'С 2 января 2026 — только через ISUN 2020 '
                + '(enims.egov.bg). С КЕП. Бесплатно.',
            },
            {
              n: '4',
              title: 'Ждать решения МИР — до 30 дней',
              desc: 'Экспертный совет оценивает заявку. '
                + 'При неполном пакете — 14 дней на исправление, '
                + 'затем новый 30-дневный срок. '
                + 'Решение сообщается в течение 7 дней после издания.',
            },
            {
              n: '5',
              title: 'Получить сертификат и подать на визу D',
              desc: 'Сертификат действует 1 год. Подаёте на визу D '
                + 'в болгарском консульстве по месту жительства. '
                + 'Для РФ — только в Москве.',
            },
            {
              n: '6',
              title: 'Въехать в Болгарию по визе D',
              desc: 'Въехать в период действия визы. '
                + 'Зарегистрировать или получить долю ≥50% '
                + 'в болгарской компании. За ~14 дней до истечения '
                + 'визы — подать на ВНЖ.',
            },
            {
              n: '7',
              title: 'Получить ВНЖ — карточку резидента',
              desc: 'ВНЖ на 1 год. Через год — подача отчёта '
                + 'о ходе проекта и продление сертификата ещё на 2 года.',
            },
          ].map(item => (
            <div key={item.n}
              className="flex items-start gap-3 rounded-xl p-3"
              style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
                style={{ backgroundColor: 'var(--accent)' }}>
                {item.n}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {item.title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Who qualifies */}
      <div className="rounded-xl p-4 space-y-2"
        style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--accent-text)' }}>
          ✅ Кто может получить
        </p>
        {[
          'Иностранец (не гражданин ЕС) с инновационным / высокотехнологичным проектом',
          'Проект в сфере: IT, biotech, fintech, edtech, medtech, deep tech, R&D и аналогичные',
          'Нет требований по минимальным инвестициям и количеству нанятых болгарских сотрудников',
          'В сертификате можно указать дополнительных участников команды (при обосновании их необходимости)',
          'После въезда по визе D — стать партнёром/акционером болгарской компании с долей ≥50%',
        ].map((item, i) => (
          <p key={i} className="text-xs" style={{ color: 'var(--accent-text)' }}>
            · {item}
          </p>
        ))}
      </div>

      {/* Warnings */}
      <div className="space-y-2">
        {[
          'Сертификат — не виза. Это один из обязательных документов для визы D, не само разрешение на въезд.',
          'Для граждан РФ виза D подаётся ТОЛЬКО в Консульском отделе Посольства в Москве. '
            + 'Консульский сбор 100 € (ст.15 п.1 ЗЧРБ). Срок ожидания до 35 рабочих дней.',
          'Нельзя сменить основание ВНЖ без выезда из Болгарии и получения новой визы D.',
          'Для продления сертификата (ещё на 2 года) нужно стать владельцем ≥50% '
            + 'болгарской компании с деятельностью, соответствующей проекту.',
        ].map((w, i) => (
          <div key={i} className="rounded-xl p-3 flex items-start gap-2"
            style={{ backgroundColor: '#fffbeb', border: '1px solid #f59e0b' }}>
            <span className="text-sm shrink-0">⚠️</span>
            <p className="text-xs" style={{ color: '#92400e' }}>{w}</p>
          </div>
        ))}
      </div>

      {/* Visa D from third country */}
      <div className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border)' }}>
        <div className="px-4 py-3"
          style={{ backgroundColor: 'var(--surface)' }}>
          <p className="text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}>
            🌍 Подача визы D не из России
          </p>
        </div>
        <div className="px-4 py-4 space-y-3"
          style={{ backgroundColor: 'var(--surface-card)' }}>

          {/* Rule */}
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            По общему правилу виза D подаётся в консульстве
            страны вашего гражданства или официального
            постоянного/временного проживания.
          </p>

          {/* From third country */}
          <div className="rounded-xl p-3"
            style={{ backgroundColor: '#fffbeb',
                     border: '1px solid #f59e0b' }}>
            <p className="text-xs font-semibold mb-1"
              style={{ color: '#92400e' }}>
              Если вы живёте в третьей стране (не РФ/UA)
            </p>
            <div className="space-y-1 text-xs"
              style={{ color: '#92400e' }}>
              <p>1. Нужно письменное разрешение МИД Болгарии.</p>
              <p>2. Написать письмо на болгарском языке
                 в свободной форме на email МИД.</p>
              <p>3. Оплатить пошлину 2.56 € (5 лв. по тарифа на МВнР).</p>
              <p>4. Ожидание ответа: 1–4 недели.</p>
              <p>5. При положительном ответе — подавать
                 в одобренное консульство с распечатанным
                 разрешением МИД.</p>
            </div>
          </div>

          {/* Documents from third country */}
          <div>
            <p className="text-xs font-semibold mb-2"
              style={{ color: 'var(--text-primary)' }}>
              Дополнительные документы при подаче из третьей страны
            </p>
            {[
              {
                doc: 'Разрешение МИД Болгарии',
                note: 'Письменный ответ — распечатать и приложить',
              },
              {
                doc: 'Копия ВНЖ страны подачи',
                note: 'Подтверждение законного пребывания в этой стране',
              },
              {
                doc: 'Справка о несудимости из страны подачи',
                note: 'Если проживаете там длительный срок '
                  + '(как правило, более 6 месяцев). '
                  + 'Уточняйте в конкретном консульстве.',
              },
              {
                doc: 'Справка о несудимости из РФ/UA (страны гражданства)',
                note: 'Также может потребоваться — уточняйте.',
              },
            ].map((item, i) => (
              <div key={i}
                className="flex items-start gap-2 py-2 border-b
                           last:border-0"
                style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs shrink-0 mt-0.5"
                  style={{ color: 'var(--accent)' }}>
                  ·
                </span>
                <div>
                  <p className="text-xs font-medium"
                    style={{ color: 'var(--text-primary)' }}>
                    {item.doc}
                  </p>
                  <p className="text-xs"
                    style={{ color: 'var(--text-muted)' }}>
                    {item.note}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Apostille */}
          <div className="rounded-xl p-3"
            style={{ backgroundColor: 'var(--accent-light)',
                     border: '1px solid var(--accent)' }}>
            <p className="text-xs font-semibold mb-1"
              style={{ color: 'var(--accent-text)' }}>
              📋 Апостиль и перевод документов
            </p>
            <div className="space-y-1 text-xs"
              style={{ color: 'var(--accent-text)' }}>
              <p>
                <strong>РФ, Украина, Беларусь:</strong> апостиль
                не требуется — действует соглашение о взаимной
                правовой помощи с Болгарией.
              </p>
              <p>
                <strong>Другие страны:</strong> апостиль обязателен.
                Уточняйте по вашей стране.
              </p>
              <p>
                <strong>Перевод:</strong> все документы переводятся
                аккредитованным переводчиком при болгарском
                посольстве/консульстве + нотариальная заверка.
              </p>
              <p>
                <strong>Справка из РФ через посольство:</strong>
                если вы в третьей стране — можно запросить
                справку о несудимости через посольство РФ
                в этой стране (сроки длиннее: 1–3 месяца).
              </p>
            </div>
          </div>

          <a href="https://www.mfa.bg/bg/uslugi-patuvania/konsulski-uslugi"
            target="_blank" rel="noreferrer"
            className="inline-block text-xs underline"
            style={{ color: 'var(--accent)' }}>
            МИД Болгарии — реквизиты для письма →
          </a>
        </div>
      </div>

      {/* Official links */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="px-4 py-3" style={{ backgroundColor: 'var(--surface)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            🔗 Официальные ресурсы
          </p>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {[
            {
              label: 'ISUN 2020 — подача заявки на сертификат',
              url: 'https://enims.egov.bg/en',
              note: 'Актуальный портал с 2 января 2026',
            },
            {
              label: 'МИР — официальная страница услуги 3263',
              url: 'https://www.mig.government.bg/3263-issuance-of-a-sertificate-for-a-high-tech-and-or-innovative-project-startup-visa/?lang=en',
              note: 'Требования, документы, контакты МИР',
            },
            {
              label: 'Email МИР: startupvisa@mig.gov.bg',
              url: 'mailto:startupvisa@mig.gov.bg',
              note: 'Телефон: +359 2 8075 393',
            },
            {
              label: 'Консульство Болгарии в Москве — виза D',
              url: 'https://www.mfa.bg/ru/embassies/russia/1773',
              note: 'Анкета, требования, запись по email',
            },
          ].map((link, i) => (
            <a key={i} href={link.url} target="_blank" rel="noreferrer"
              className="flex items-start justify-between px-4 py-3 hover:opacity-80"
              style={{ backgroundColor: 'var(--surface-card)' }}>
              <div>
                <p className="text-sm" style={{ color: 'var(--accent)' }}>{link.label}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{link.note}</p>
              </div>
              <span className="text-xs shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>→</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
