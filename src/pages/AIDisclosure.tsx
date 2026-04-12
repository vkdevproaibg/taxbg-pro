import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUserStore } from '../store/userStore'
import type { AppLanguage } from '../store/userStore'

type DocLang = 'bg' | AppLanguage

const TRANSLATIONS: Record<AppLanguage, {
  backHome: string
  title: string
  subtitle: string
  translationHint: string
  tabs: { bg: string; ru: string; uk: string; en: string }
}> = {
  ru: {
    backHome: 'На главную',
    title: 'Декларация об использовании ИИ',
    subtitle: 'Согласно Регламенту (ЕС) 2024/1689 (AI Act)',
    translationHint: 'Перевод носит информационный характер.',
    tabs: { bg: 'Български (официален)', ru: 'Русский', uk: 'Українська', en: 'English' },
  },
  uk: {
    backHome: 'На головну',
    title: 'Декларація про використання ШІ',
    subtitle: 'Згідно з Регламентом (ЄС) 2024/1689 (AI Act)',
    translationHint: 'Переклад має інформаційний характер.',
    tabs: { bg: 'Български (офіційний)', ru: 'Русский', uk: 'Українська', en: 'English' },
  },
  en: {
    backHome: 'Home',
    title: 'AI Disclosure',
    subtitle: 'In accordance with Regulation (EU) 2024/1689 (AI Act)',
    translationHint: 'The translation is informational only.',
    tabs: { bg: 'Български (official)', ru: 'Русский', uk: 'Українська', en: 'English' },
  },
  bg: {
    backHome: 'Начало',
    title: 'Декларация за използване на AI',
    subtitle: 'Съгласно Регламент (ЕС) 2024/1689 (AI Act)',
    translationHint: 'Преводът е с информативен характер.',
    tabs: { bg: 'Български (официален)', ru: 'Русский', uk: 'Українська', en: 'English' },
  },
}

const BG_TEXT = `Декларация за използване на изкуствен интелект (AI)
Съгласно Регламент (ЕС) 2024/1689 (AI Act)

TaxBG Pro използва AI технологии в следните функции:

1. Автоматично генериране на счетоводни проводки

При въвеждане на транзакция системата автоматично създава проводки по Националния сметкоплан. Генерирането е основано на правила (rule-based) и допълнително подпомогнато от AI класификация. Потребителят може да редактира или изтрие всяка проводка.

2. AI Асистент (чат)

Използва голям езиков модел (LLM) чрез API ключ, предоставен от потребителя. Отговорите са маркирани с индикатор „🤖 Генерирано от AI". Асистентът НЕ взема решения — само предоставя информация и пояснения. НЕ се изпращат сурови лични данни към доставчика — само агрегирани суми и обобщения.

3. Генериране на обяснителни записки за данъчни проверки

Шаблоните за стандартни въпроси на НАП са предварително написани от човек. AI може да допълни отговор на нестандартен въпрос — такъв отговор е ясно маркиран с „🤖 AI-генерирано. Проверете преди употреба." Потребителят е длъжен да провери и одобри всеки AI-генериран текст.

Категория на AI системата

AI система с ограничен риск (limited risk) по смисъла на чл. 50 от AI Act. Единственото задължение е за прозрачност (transparency obligation): потребителят трябва да бъде информиран, че взаимодейства с AI, и AI-генерираното съдържание трябва да бъде ясно маркирано.

TaxBG Pro НЕ използва AI за:

• Вземане на автоматизирани решения с правно значение (чл. 22 GDPR)
• Профилиране на потребители
• Биометрично разпознаване
• Оценка на кредитоспособност
• Социално оценяване (social scoring)
• Емоционално разпознаване
• Манипулативни или подсъзнателни техники

Принцип на човешки контрол (human oversight)

Всички AI-генерирани резултати подлежат на преглед и одобрение от потребителя преди използване. Системата не изпълнява автоматично действия на базата на AI-резултати без изрично потвърждение от човек.`

const RU_TEXT = `Декларация об использовании искусственного интеллекта (AI)
Согласно Регламенту (ЕС) 2024/1689 (AI Act)

TaxBG Pro использует AI технологии в следующих функциях:

1. Автоматическое формирование проводок

При вводе транзакции система автоматически создаёт проводки по Национальному плану счетов Болгарии. Генерация основана на правилах (rule-based) и дополнительно поддерживается AI-классификацией. Пользователь может редактировать или удалить любую проводку.

2. AI-ассистент (чат)

Использует большую языковую модель (LLM) через API-ключ, предоставленный пользователем. Ответы помечены индикатором «🤖 Сгенерировано AI». Ассистент НЕ принимает решений — только предоставляет информацию. В LLM-провайдер НЕ отправляются сырые персональные данные — только агрегированные суммы.

3. Генерация пояснительных записок для налоговых проверок

Шаблоны для стандартных вопросов НАП написаны человеком. AI может дополнить ответ на нестандартный вопрос — такой ответ помечен «🤖 AI-генерировано. Проверьте перед использованием.» Пользователь обязан проверить и одобрить каждый AI-текст.

Категория AI-системы

AI-система с ограниченным риском (limited risk) по смыслу ст. 50 AI Act. Обязательство прозрачности: пользователь должен быть информирован о взаимодействии с AI, а AI-контент должен быть чётко помечен.

TaxBG Pro НЕ использует AI для:

• Принятия автоматизированных решений с юридическим значением (ст. 22 GDPR)
• Профилирования пользователей
• Биометрического распознавания
• Оценки кредитоспособности
• Социального скоринга (social scoring)
• Распознавания эмоций
• Манипулятивных или подсознательных техник

Принцип человеческого контроля (human oversight)

Все AI-результаты подлежат проверке и одобрению пользователем перед использованием. Система не выполняет действий автоматически на основании AI-результатов без явного подтверждения человека.`

const UK_TEXT = `Декларація про використання штучного інтелекту (AI)
Згідно з Регламентом (ЄС) 2024/1689 (AI Act)

TaxBG Pro використовує AI технології в наступних функціях:

1. Автоматичне формування проводок

При введенні транзакції система автоматично створює проводки за Національним планом рахунків Болгарії. Генерація заснована на правилах (rule-based) та додатково підтримується AI-класифікацією. Користувач може редагувати або видалити будь-яку проводку.

2. AI-асистент (чат)

Використовує велику мовну модель (LLM) через API-ключ, наданий користувачем. Відповіді позначені індикатором «🤖 Згенеровано AI». Асистент НЕ приймає рішень — лише надає інформацію. У LLM-провайдер НЕ відправляються сирі персональні дані — лише агреговані суми.

3. Генерація пояснювальних записок для податкових перевірок

Шаблони для стандартних питань НАП написані людиною. AI може доповнити відповідь на нестандартне питання — така відповідь позначена «🤖 AI-згенеровано. Перевірте перед використанням.» Користувач зобов'язаний перевірити та схвалити кожен AI-текст.

Категорія AI-системи

AI-система з обмеженим ризиком (limited risk) за змістом ст. 50 AI Act. Зобов'язання прозорості: користувач має бути поінформований про взаємодію з AI, а AI-контент має бути чітко позначений.

TaxBG Pro НЕ використовує AI для:

• Прийняття автоматизованих рішень з юридичним значенням (ст. 22 GDPR)
• Профілювання користувачів
• Біометричного розпізнавання
• Оцінки кредитоспроможності
• Соціального скорингу (social scoring)
• Розпізнавання емоцій
• Маніпулятивних або підсвідомих технік

Принцип людського контролю (human oversight)

Всі AI-результати підлягають перевірці та схваленню користувачем перед використанням. Система не виконує дій автоматично на підставі AI-результатів без явного підтвердження людини.`

const EN_TEXT = `Artificial Intelligence (AI) Disclosure
In accordance with Regulation (EU) 2024/1689 (AI Act)

TaxBG Pro uses AI technologies in the following features:

1. Automatic generation of accounting entries

When a transaction is entered, the system automatically creates journal entries according to the Bulgarian National Chart of Accounts. Generation is rule-based with additional AI-assisted classification. The user can edit or delete any entry.

2. AI Assistant (chat)

Uses a Large Language Model (LLM) via an API key provided by the user. Responses are labelled with a "🤖 AI-generated" indicator. The assistant does NOT make decisions — it only provides information. No raw personal data is sent to the LLM provider — only aggregated totals.

3. Generating explanatory notes for tax audits

Templates for standard NRA questions are written by humans. AI may supplement an answer to a non-standard question — such an answer is clearly labelled "🤖 AI-generated. Please review before use." The user is required to verify and approve every AI-generated text.

AI System Category

Limited-risk AI system within the meaning of Art. 50 of the AI Act. The sole obligation is transparency: the user must be informed that they are interacting with AI, and AI-generated content must be clearly labelled.

TaxBG Pro does NOT use AI for:

• Automated decision-making with legal effect (Art. 22 GDPR)
• User profiling
• Biometric identification
• Credit scoring
• Social scoring
• Emotion recognition
• Manipulative or subliminal techniques

Principle of human oversight

All AI-generated results are subject to review and approval by the user before use. The system does not execute actions based on AI results without explicit human confirmation.`

const BODIES: Record<DocLang, string> = {
  bg: BG_TEXT,
  ru: RU_TEXT,
  uk: UK_TEXT,
  en: EN_TEXT,
}

export default function AIDisclosure() {
  const language = useUserStore((s) => s.language)
  const ui = TRANSLATIONS[language] ?? TRANSLATIONS.ru
  const [tab, setTab] = useState<DocLang>('bg')

  return (
    <div className="min-h-screen px-4 py-10" style={{ backgroundColor: 'var(--surface)' }}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between text-sm">
          <Link to="/" className="text-blue-600 hover:underline">{ui.backHome}</Link>
          <div className="flex gap-3">
            <Link to="/privacy" className="text-slate-500 hover:underline">Privacy</Link>
            <Link to="/terms" className="text-slate-500 hover:underline">Terms</Link>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-slate-800">{ui.title}</h1>
        <p className="mt-2 text-sm text-slate-500">{ui.subtitle}</p>

        <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200">
          {(['bg', 'ru', 'uk', 'en'] as DocLang[]).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setTab(code)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
                tab === code
                  ? 'border-blue-600 text-blue-700 font-medium'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {ui.tabs[code]}
            </button>
          ))}
        </div>

        {tab !== 'bg' && (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            {ui.translationHint}
          </p>
        )}

        <article className="mt-6 whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-6 text-[0.92rem] leading-relaxed text-slate-800 shadow-sm">
          {BODIES[tab]}
        </article>

        <p className="mt-6 text-xs text-slate-400">© 2026 TaxBG Pro</p>
      </div>
    </div>
  )
}
