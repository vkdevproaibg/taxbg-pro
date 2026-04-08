import { useState, useMemo } from 'react'
import { LEGAL_ACTS, CATEGORY_LABELS } from '../constants/legal-acts'
import type { LegalActCategory } from '../constants/legal-acts'
import { CALENDAR_EVENTS_2026 } from '../constants/calendar-events'
import { useUserStore } from '../store/userStore'
import { useHelpStore } from '../store/helpStore'
import { getUpcomingEvents } from '../lib/calendarUtils'
import HelpButton from '../components/ui/HelpButton'

type Tab = 'today' | 'all'

// Match calendar event to legal act by legalBasis field
function findActForEvent(legalBasis: string) {
  const upper = legalBasis.toUpperCase()
  return LEGAL_ACTS.find((a) => upper.includes(a.code))
}

export default function LegalReference() {
  const { legalForm } = useUserStore()
  const openHelp = useHelpStore((s) => s.openHelp)
  const [tab, setTab] = useState<Tab>('today')
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<LegalActCategory | 'all'>('all')
  const [expandedAct, setExpandedAct] = useState<string | null>(null)

  // "Актуально сейчас" - upcoming events for next 30 days
  const upcoming = useMemo(
    () => getUpcomingEvents(CALENDAR_EVENTS_2026, legalForm, 30),
    [legalForm]
  )

  // Deduplicate: one entry per unique legal act
  const todayActs = useMemo(() => {
    const seen = new Set<string>()
    const result: {
      act: typeof LEGAL_ACTS[0]
      event: typeof upcoming[0]['event']
      daysUntil: number
    }[] = []

    for (const { event, daysUntil } of upcoming) {
      const act = findActForEvent(event.legalBasis)
      if (!act || seen.has(act.id)) continue
      seen.add(act.id)
      result.push({ act, event, daysUntil })
    }

    return result.sort((a, b) => a.daysUntil - b.daysUntil)
  }, [upcoming])

  const sortedTodayActs = useMemo(
    () => [...todayActs].sort((a, b) => a.daysUntil - b.daysUntil),
    [todayActs]
  )

  // All laws filtered
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return LEGAL_ACTS.filter((act) => {
      if (filterCat !== 'all' && act.category !== filterCat) return false
      if (!q) return true
      return (
        act.code.toLowerCase().includes(q) ||
        act.fullName_ru.toLowerCase().includes(q) ||
        act.summary_ru.toLowerCase().includes(q) ||
        act.keyArticles.some((a) =>
          a.title_ru.toLowerCase().includes(q) ||
          a.summary_ru.toLowerCase().includes(q)
        )
      )
    })
  }, [search, filterCat])

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Справочник нормативной базы</h1>
        <p className="mt-1 text-sm text-slate-400">
          Действующие законы Болгарии 2026 · нажмите ? для AI-объяснения на вашем языке
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {([
          { id: 'today', label: `Сегодня актуально (${sortedTodayActs.length})` },
          { id: 'all', label: 'Все законы' },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg py-2 text-sm transition-colors ${
              tab === t.id
                ? 'bg-white font-medium shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* -- TAB: TODAY -- */}
      {tab === 'today' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Законы и нормы которые актуальны в ближайшие 30 дней для вашей правовой формы
          </p>

          {sortedTodayActs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
              Нет актуальных обязательств в ближайшие 30 дней
            </div>
          ) : (
            sortedTodayActs.map(({ act, event, daysUntil }) => (
              <div key={act.id}
                className={`rounded-xl border bg-white shadow-sm overflow-hidden ${
                  daysUntil <= 3  ? 'border-red-200' :
                  daysUntil <= 7  ? 'border-amber-200' :
                  daysUntil <= 14 ? 'border-yellow-200' :
                  'border-slate-100'
                }`}>

                {/* Urgency + deadline banner */}
                <div className={`px-4 py-2 flex items-center justify-between text-xs font-medium ${
                  daysUntil <= 3  ? 'bg-red-50 text-red-700' :
                  daysUntil <= 7  ? 'bg-amber-50 text-amber-700' :
                  daysUntil <= 14 ? 'bg-yellow-50 text-yellow-700' :
                  'bg-slate-50 text-slate-500'
                }`}>
                  <span>
                    {daysUntil === 0
                      ? '❗ Срок сегодня'
                      : daysUntil <= 3
                      ? `❗ Через ${daysUntil} дн.`
                      : daysUntil <= 7
                      ? `🟡 Через ${daysUntil} дн.`
                      : `🟢 Через ${daysUntil} дн.`}
                  </span>
                  <span>{event.title_ru} · до {event.dayOfMonth ?? event.day}-го</span>
                </div>

                {/* Law info */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 rounded-lg bg-violet-50 px-3 py-1.5 text-center min-w-[64px]">
                      <span className="text-sm font-bold text-violet-700">{act.code}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {daysUntil <= 3 && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                            !
                          </span>
                        )}
                        <p className="font-medium text-slate-800">{act.fullName_ru}</p>
                        <HelpButton
                          topic={`${act.code} ${event.legalBasis} — ${event.title_ru}`}
                          title={`${act.code} · ${event.title_ru}`}
                          pageContext="legal-reference-today"
                        />
                      </div>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                        {act.summary_ru}
                      </p>
                      <p className="text-xs text-slate-400 mt-1.5">
                        {event.legalBasis} · {act.dv} · в силе с {act.effectiveFrom}
                      </p>
                    </div>
                  </div>

                  {/* Key articles relevant to this deadline */}
                  <div className="mt-3 space-y-1.5">
                    {act.keyArticles.slice(0, 3).map((ka) => (
                      <div key={ka.article}
                        className="flex items-start gap-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                        <span className="rounded bg-violet-50 px-1.5 py-0.5 text-xs font-mono font-medium text-violet-700 shrink-0">
                          {ka.article}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-slate-700">{ka.title_ru}</span>
                          <span className="text-xs text-slate-400 ml-2">{ka.summary_ru}</span>
                        </div>
                        <HelpButton
                          topic={`${act.code} ${ka.article} — ${ka.title_ru}`}
                          title={`${act.code} ${ka.article}`}
                          pageContext="legal-reference-today"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Penalty reminder */}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-red-500">{event.penaltyInfo_ru}</span>
                    <div className="flex gap-2">
                      {event.links.slice(0, 1).map((link) => (
                        <a key={link.url} href={link.url} target="_blank" rel="noreferrer"
                          className="text-xs text-violet-500 underline hover:text-violet-700">
                          {link.label}
                        </a>
                      ))}
                      <a href={act.url} target="_blank" rel="noreferrer"
                        className="text-xs text-violet-500 underline hover:text-violet-700">
                        Текст закона →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* AI explain all button */}
          {sortedTodayActs.length > 0 && (
            <button
              onClick={() => openHelp({
                topic: sortedTodayActs.map((a) => a.act.code).join(', '),
                title: 'Все актуальные обязательства',
                pageContext: 'legal-reference-today',
              })}
              className="w-full rounded-xl border border-violet-200 bg-violet-50 py-3 text-sm font-medium text-violet-700 hover:bg-violet-100 transition-colors">
              ? Объясни все актуальные обязательства этого месяца
            </button>
          )}
        </div>
      )}

      {/* -- TAB: ALL LAWS -- */}
      {tab === 'all' && (
        <div className="space-y-4">
          {/* Search + category filter */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск: ЗКПО, дивиденти, амортизация..."
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
          />

          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilterCat('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                filterCat === 'all'
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              Все
            </button>
            {(Object.entries(CATEGORY_LABELS) as [LegalActCategory, string][]).map(([cat, label]) => (
              <button key={cat}
                onClick={() => setFilterCat(cat === filterCat ? 'all' : cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                  filterCat === cat
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {search && (
            <p className="text-xs text-slate-400">
              Найдено: {filtered.length} из {LEGAL_ACTS.length}
            </p>
          )}

          {filtered.map((act) => (
            <div key={act.id}
              className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              <div
                className="flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedAct(expandedAct === act.id ? null : act.id)}
              >
                <div className="shrink-0 rounded-lg bg-violet-50 px-3 py-1.5 text-center min-w-[64px]">
                  <span className="text-sm font-bold text-violet-700">{act.code}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-800">{act.fullName_ru}</p>
                    <HelpButton
                      topic={`${act.code} — ${act.fullName_ru}`}
                      title={act.code}
                      pageContext="legal-reference"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{act.fullName_bg}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {act.dv} · в силе с {act.effectiveFrom}
                    {act.effectiveTo && ` · до ${act.effectiveTo}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={act.url} target="_blank" rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-violet-500 underline hover:text-violet-700">
                    Текст
                  </a>
                  <span className="text-slate-300 text-lg">
                    {expandedAct === act.id ? '−' : '+'}
                  </span>
                </div>
              </div>

              <div className="px-4 pb-3">
                <p className="text-sm text-slate-600 leading-relaxed">{act.summary_ru}</p>
              </div>

              {expandedAct === act.id && (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-3">
                    Ключевые статьи
                  </p>
                  {act.keyArticles.map((ka) => (
                    <div key={ka.article}
                      className="flex items-start gap-3 rounded-lg bg-white border border-slate-100 p-3">
                      <span className="rounded bg-violet-50 px-2 py-0.5 text-xs font-mono font-medium text-violet-700 shrink-0">
                        {ka.article}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700">{ka.title_ru}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{ka.summary_ru}</p>
                      </div>
                      <HelpButton
                        topic={`${act.code} ${ka.article} — ${ka.title_ru}`}
                        title={`${act.code} ${ka.article}`}
                        pageContext="legal-reference"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
              Ничего не найдено по запросу "{search}"
            </div>
          )}
        </div>
      )}

      {/* AI hint */}
      <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-xs text-violet-700">
        <strong>Совет:</strong> нажмите <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-violet-200 text-violet-700 font-bold text-xs mx-1">?</span> рядом с любым законом или статьей - AI объяснит на вашем языке что это значит для вашего бизнеса.
      </div>
    </div>
  )
}
