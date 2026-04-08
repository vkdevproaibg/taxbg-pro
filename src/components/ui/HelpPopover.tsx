import { useEffect, useRef, useState } from 'react'
import { useHelpStore } from '../../store/helpStore'
import { useUserStore } from '../../store/userStore'
import { LEGAL_ACTS } from '../../constants/legal-acts'
import { llmChat } from '../../lib/llm'

const HELP_SYSTEM_PROMPT = `Ты — встроенный правовой ассистент приложения TaxBG Pro.
Отвечаешь на вопросы о болгарском налоговом и корпоративном праве 2026 года.
Аудитория — IT предприниматели из России и Украины, переехавшие в Болгарию.

Формат ответа (всегда в таком порядке):
1. Что это такое — 1-2 предложения простым языком
2. Чем регулируется — конкретный закон и статья
3. Почему важно для вас — практический смысл
4. Что нужно сделать — конкретные действия (если применимо)
5. Штраф или риск — если есть

Отвечай на том языке на котором задан вопрос.
Будь конкретен и краток — максимум 200 слов.`

export default function HelpPopover() {
  const { open, context, closeHelp } = useHelpStore()
  const { language, llmApiKey } = useUserStore()
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  const relatedAct = context
    ? LEGAL_ACTS.find((a) =>
        context.topic.toUpperCase().includes(a.code) ||
        a.keyArticles.some((ka) =>
          context.topic.toLowerCase().includes(ka.article.toLowerCase())
        )
      )
    : null

  useEffect(() => {
    if (!open || !context) { setAnswer(''); return }

    const langHint =
      language === 'ru' ? 'Отвечай на русском языке.' :
      language === 'uk' ? 'Відповідай українською мовою.' :
      language === 'bg' ? 'Отговори на български език.' :
      'Answer in English.'

    const question = `${langHint}

Контекст: пользователь на странице "${context.pageContext ?? 'приложения'}" TaxBG Pro.
Вопрос о: "${context.topic}"${context.title ? ` (${context.title})` : ''}.
${relatedAct ? `Связанный закон: ${relatedAct.code} — ${relatedAct.fullName_ru}` : ''}

Объясни что это, как регулируется болгарским правом 2026 и что нужно сделать.`

    setLoading(true)
    setAnswer('')

    llmChat(
      [{ role: 'user', content: question }],
      {
        systemPrompt: HELP_SYSTEM_PROMPT,
        maxTokens: 600,
        temperature: 0.3,
        apiKey: llmApiKey || undefined,
      }
    )
      .then((r) => setAnswer(r.content))
      .catch(() => setAnswer('Не удалось получить ответ. Проверьте API ключ в Настройках.'))
      .finally(() => setLoading(false))
  }, [open, context, language, llmApiKey, relatedAct])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeHelp() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closeHelp])

  if (!open || !context) return null

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) closeHelp() }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-4"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 py-4 bg-violet-50 border-b border-violet-100">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-violet-600 font-bold text-lg">?</span>
              <h3 className="font-semibold text-violet-900 truncate">
                {context.title ?? context.topic}
              </h3>
            </div>
            {relatedAct && (
              <p className="text-xs text-violet-600 mt-0.5">
                {relatedAct.code} · {relatedAct.fullName_ru}
              </p>
            )}
          </div>
          <button onClick={closeHelp}
            className="text-violet-400 hover:text-violet-600 text-xl leading-none shrink-0">
            ×
          </button>
        </div>

        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`h-3 rounded bg-slate-100 animate-pulse ${i === 3 ? 'w-2/3' : 'w-full'}`} />
              ))}
              <p className="text-xs text-slate-400 mt-3">Запрашиваю у AI...</p>
            </div>
          ) : (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{answer}</p>
          )}

          {relatedAct && !loading && answer && (
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1.5">
              <p className="text-xs font-medium text-slate-600">Правова база</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {relatedAct.dv} · в силе с {relatedAct.effectiveFrom}
                </span>
                <a href={relatedAct.url} target="_blank" rel="noreferrer"
                  className="text-xs text-violet-500 underline hover:text-violet-700">
                  Официален текст →
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            TaxBG AI · данные 2026 · не является юридической консультацией
          </p>
          <button onClick={closeHelp}
            className="rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-700">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
