import { useEffect, useRef, useState } from 'react'
import { useHelpStore } from '../../store/helpStore'
import { useUserStore } from '../../store/userStore'
import { LEGAL_ACTS } from '../../constants/legal-acts'
import { llmChat } from '../../lib/llm'
import { useT } from '../../lib/useT'

const HELP_SYSTEM_PROMPT = `Ты — встроенный правовой ассистент приложения TaxBG Pro.
Отвечаешь на вопросы о болгарском налоговом и корпоративном праве 2026 года.
Аудитория — IT предприниматели из России и Украины, переехавшие в Болгарию.
Большинство не знает болгарского — объясняй простыми словами.

Формат ответа (строго в таком порядке, без заголовков):

[1-2 предложения: что это такое простым языком]

[Чем регулируется и конкретная статья — одна строка]

[Почему это важно именно для вас — практический смысл]

[Что нужно сделать — конкретные шаги если применимо]

[Штраф или риск если не сделать — если есть, одна строка]

Отвечай на том языке на котором задан вопрос.
Максимум 180 слов. Никаких markdown заголовков.`

function findRelevantActs(topic: string): {
  act: typeof LEGAL_ACTS[0]
  articles: typeof LEGAL_ACTS[0]['keyArticles']
}[] {
  const lo = topic.toLowerCase()
  const up = topic.toUpperCase()
  const results: {
    act: typeof LEGAL_ACTS[0]
    articles: typeof LEGAL_ACTS[0]['keyArticles']
  }[] = []

  for (const act of LEGAL_ACTS) {
    const codeMatch = up.includes(act.code)

    const matched = act.keyArticles.filter(ka => {
      const tlo = ka.title_ru.toLowerCase()
      const slo = ka.summary_ru.toLowerCase()
      return (
        lo.includes(ka.article.toLowerCase()) ||
        // DDS
        (lo.includes('ддс') && act.code === 'ЗДДС') ||
        (lo.includes('vat') && act.code === 'ЗДДС') ||
        (lo.includes('данък добавена') && act.code === 'ЗДДС') ||
        // ZKPO
        (lo.includes('корпоратив') && act.code === 'ЗКПО') ||
        (lo.includes('амортиз') && act.code === 'ЗКПО' && (tlo.includes('амортиз') || slo.includes('амортиз'))) ||
        (lo.includes('непризнав') && act.code === 'ЗКПО' && tlo.includes('непризнав')) ||
        (lo.includes('автомоб') && act.code === 'ЗКПО') ||
        (lo.includes('мпс') && act.code === 'ЗКПО') ||
        (lo.includes('авансов') && act.code === 'ЗКПО' && tlo.includes('аванс')) ||
        (lo.includes('данъчна основа') && act.code === 'ЗКПО') ||
        (lo.includes('приход') && act.code === 'ЗКПО' && tlo.includes('приход')) ||
        (lo.includes('разход') && act.code === 'ЗКПО' && tlo.includes('разход')) ||
        (lo.includes('трансфер') && act.code === 'ЗКПО') ||
        (lo.includes('group') && act.code === 'ЗКПО') ||
        // ZDDFL
        (lo.includes('дивид') && act.code === 'ЗДДФЛ' && (tlo.includes('дивид') || slo.includes('дивид'))) ||
        (lo.includes('нормативн') && act.code === 'ЗДДФЛ' && tlo.includes('нормативн')) ||
        (lo.includes('продажба') && act.code === 'ЗДДФЛ' && tlo.includes('продажб')) ||
        (lo.includes('ликвидацион') && act.code === 'ЗДДФЛ') ||
        (lo.includes('доход') && act.code === 'ЗДДФЛ' && tlo.includes('доход')) ||
        // KSO / ZZO
        (lo.includes('осигур') && (act.code === 'КСО' || act.code === 'ЗЗО')) ||
        (lo.includes('образец 1') && act.code === 'КСО') ||
        (lo.includes('социал') && act.code === 'КСО') ||
        // KT
        (lo.includes('заплат') && act.code === 'КТ') ||
        (lo.includes('salary') && act.code === 'КТ') ||
        (lo.includes('трудов') && act.code === 'КТ') ||
        (lo.includes('уволн') && act.code === 'КТ') ||
        (lo.includes('отпуск') && act.code === 'КТ') ||
        (lo.includes('ликвидац') && act.code === 'КТ' && tlo.includes('ликвидац')) ||
        // ZSch
        (lo.includes('счетовод') && act.code === 'ЗСч') ||
        (lo.includes('гфо') && act.code === 'ЗСч') ||
        (lo.includes('баланс') && act.code === 'ЗСч') ||
        (lo.includes('опр') && act.code === 'ЗСч') ||
        (lo.includes('ликвидац') && act.code === 'ЗСч') ||
        // NSI
        (lo.includes('нси') && act.code === 'ЗСТАТИСТИКАТА') ||
        (lo.includes('статистик') && act.code === 'ЗСТАТИСТИКАТА') ||
        // KEP
        (lo.includes('кеп') && act.code === 'ЗЕДЕУУ') ||
        (lo.includes('подпис') && act.code === 'ЗЕДЕУУ') ||
        (lo.includes('електрон') && act.code === 'ЗЕДЕУУ')
      )
    })

    if (codeMatch || matched.length > 0) {
      results.push({
        act,
        articles: matched.length > 0
          ? matched
          : act.keyArticles.slice(0, 2),
      })
    }
  }

  return results
}

export default function HelpPopover() {
  const t = useT()
  const { open, context, closeHelp } = useHelpStore()
  const { language, llmApiKey }      = useUserStore()
  const [answer,       setAnswer]       = useState('')
  const [loading,      setLoading]      = useState(false)
  const [actsExpanded, setActsExpanded] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  const relevantActs = context ? findRelevantActs(context.topic) : []

  useEffect(() => {
    if (!open || !context) { setAnswer(''); setActsExpanded(false); return }

    const langHint =
      language === 'ru' ? 'Отвечай на русском языке.' :
      language === 'uk' ? 'Відповідай українською мовою.' :
      language === 'bg' ? 'Отговори на български език.'  :
      'Answer in English.'

    const actsHint = relevantActs.length > 0
      ? `\nСвязанные законы: ${relevantActs
          .map(r => `${r.act.code} (${r.articles.map(a => a.article).join(', ')})`)
          .join('; ')}`
      : ''

    const question = `${langHint}

Контекст: страница "${context.pageContext ?? 'приложения'}" TaxBG Pro.
Вопрос о: "${context.topic}"${context.title ? ` (${context.title})` : ''}.${actsHint}

Объясни простыми словами.`

    setLoading(true)
    setAnswer('')

    llmChat(
      [{ role: 'user', content: question }],
      {
        systemPrompt: HELP_SYSTEM_PROMPT,
        maxTokens: 500,
        temperature: 0.3,
        apiKey: llmApiKey || undefined,
      }
    )
      .then(r  => setAnswer(r.content))
      .catch(() => setAnswer(
        'Не удалось получить ответ. Проверьте API ключ в Настройках → AI модел.'
      ))
      .finally(() => setLoading(false))

  }, [open, context, language, llmApiKey])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') closeHelp() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [closeHelp])

  if (!open || !context) return null

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) closeHelp() }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>

      <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--surface-card)' }}>

        {/* ── Header ────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b"
          style={{
            backgroundColor: 'var(--accent-light)',
            borderColor: 'var(--accent)',
          }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg" style={{ color: 'var(--accent)' }}>
                ?
              </span>
              <h3 className="font-semibold truncate"
                style={{ color: 'var(--accent-text)' }}>
                {context.title ?? context.topic}
              </h3>
            </div>
            {relevantActs.length > 0 && (
              <div className="flex gap-1.5 mt-1 flex-wrap">
                {relevantActs.map(r => (
                  <span key={r.act.code}
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: '#fff',
                    }}>
                    {r.act.code}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button onClick={closeHelp}
            className="text-xl leading-none shrink-0 mt-0.5"
            style={{ color: 'var(--accent)' }}>
            ×
          </button>
        </div>

        {/* ── Scrollable body ───────────────────────────────── */}
        <div className="max-h-[60vh] overflow-y-auto">

          {/* AI explanation — always first, always visible */}
          <div className="px-5 py-4">
            {loading ? (
              <div className="space-y-2.5">
                {[100, 90, 95, 70, 80].map((w, i) => (
                  <div key={i}
                    className="h-3 rounded animate-pulse"
                    style={{
                      width: `${w}%`,
                      backgroundColor: 'var(--border)',
                    }} />
                ))}
                <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                  Запрашиваю у AI...
                </p>
              </div>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-line"
                style={{ color: 'var(--text-secondary)' }}>
                {answer}
              </p>
            )}
          </div>

          {/* ── Legal acts — collapsible ──────────────────────── */}
          {relevantActs.length > 0 && (
            <div className="border-t" style={{ borderColor: 'var(--border)' }}>

              {/* Toggle button */}
              <button
                onClick={() => setActsExpanded(e => !e)}
                className="w-full flex items-center justify-between px-5 py-3
                  hover:opacity-80 transition-opacity"
                style={{ backgroundColor: 'var(--surface)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-sm">📚</span>
                  <span className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}>
                    Нормативна база
                  </span>
                  <span className="rounded-full px-1.5 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: 'var(--accent-light)',
                      color: 'var(--accent)',
                    }}>
                    {relevantActs.reduce((s, r) => s + r.articles.length, 0)} статей
                  </span>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {actsExpanded ? '▲ свернуть' : '▼ показать'}
                </span>
              </button>

              {/* Expanded content */}
              {actsExpanded && (
                <div className="px-5 pb-4 space-y-3">
                  {relevantActs.map(({ act, articles }) => (
                    <div key={act.id}
                      className="rounded-xl overflow-hidden"
                      style={{ border: '1px solid var(--border)' }}>

                      {/* Act header with link */}
                      <div className="flex items-center justify-between px-4 py-2.5"
                        style={{ backgroundColor: 'var(--surface)' }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="rounded-full px-2 py-0.5 text-xs font-bold
                            shrink-0 text-white"
                            style={{ backgroundColor: 'var(--accent)' }}>
                            {act.code}
                          </span>
                          <span className="text-xs font-medium truncate"
                            style={{ color: 'var(--text-primary)' }}>
                            {act.fullName_ru}
                          </span>
                        </div>
                        <a
                          href={act.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium shrink-0 ml-3 underline"
                          style={{ color: 'var(--accent)' }}
                          onClick={e => e.stopPropagation()}>
                          Текст →
                        </a>
                      </div>

                      {/* Matched articles */}
                      {articles.length > 0 && (
                        <div className="divide-y"
                          style={{ borderColor: 'var(--border)' }}>
                          {articles.map(article => (
                            <div key={article.article}
                              className="flex items-start gap-3 px-4 py-2.5"
                              style={{ backgroundColor: 'var(--surface-card)' }}>
                              <span
                                className="rounded px-1.5 py-0.5 text-xs font-mono
                                  shrink-0 mt-0.5"
                                style={{
                                  backgroundColor: 'var(--accent-light)',
                                  color: 'var(--accent)',
                                }}>
                                {article.article}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium"
                                  style={{ color: 'var(--text-primary)' }}>
                                  {article.title_ru}
                                </p>
                                <p className="text-xs mt-0.5"
                                  style={{ color: 'var(--text-muted)' }}>
                                  {article.summary_ru}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Act meta */}
                      <div className="px-4 py-2 flex items-center justify-between"
                        style={{
                          backgroundColor: 'var(--surface)',
                          borderTop: '1px solid var(--border)',
                        }}>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {act.dv} · в силе с {act.effectiveFrom}
                        </span>
                        {act.effectiveTo && (
                          <span className="text-xs font-medium"
                            style={{ color: 'var(--danger)' }}>
                            до {act.effectiveTo}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────── */}
        <div className="px-5 py-3 border-t flex items-center justify-between"
          style={{
            borderColor: 'var(--border)',
            backgroundColor: 'var(--surface)',
          }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {t('help_disclaimer')}
          </p>
          <button
            onClick={closeHelp}
            className="rounded-lg px-4 py-1.5 text-xs font-medium text-white"
            style={{ backgroundColor: 'var(--accent)' }}>
            {t('btn_close')}
          </button>
        </div>
      </div>
    </div>
  )
}
