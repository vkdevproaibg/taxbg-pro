import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUserStore } from '../store/userStore'
import type { AppLanguage } from '../store/userStore'

type DocLang = 'bg' | AppLanguage

const TRANSLATIONS: Record<AppLanguage, {
  back: string
  backHome: string
  title: string
  subtitle: string
  translationHint: string
  tabs: { bg: string; ru: string; uk: string; en: string }
}> = {
  ru: {
    back: '← Назад',
    backHome: 'На главную',
    title: 'Политика конфиденциальности',
    subtitle: 'Официальная версия — на болгарском языке. Ниже — перевод для удобства.',
    translationHint: 'Перевод носит информационный характер. В случае расхождений приоритет имеет болгарский текст.',
    tabs: { bg: 'Български (официален)', ru: 'Русский', uk: 'Українська', en: 'English' },
  },
  uk: {
    back: '← Назад',
    backHome: 'На головну',
    title: 'Політика конфіденційності',
    subtitle: 'Офіційна версія — болгарською мовою. Нижче — переклад для зручності.',
    translationHint: 'Переклад має інформаційний характер. У разі розбіжностей пріоритет має болгарський текст.',
    tabs: { bg: 'Български (офіційний)', ru: 'Русский', uk: 'Українська', en: 'English' },
  },
  en: {
    back: '← Back',
    backHome: 'Home',
    title: 'Privacy Policy',
    subtitle: 'The official version is in Bulgarian. A translation is provided below for convenience.',
    translationHint: 'The translation is informational only. In case of discrepancies the Bulgarian text prevails.',
    tabs: { bg: 'Български (official)', ru: 'Русский', uk: 'Українська', en: 'English' },
  },
  bg: {
    back: '← Назад',
    backHome: 'Начало',
    title: 'Политика за поверителност',
    subtitle: 'Официалният текст е на български език. По-долу е преводът за удобство.',
    translationHint: 'Преводът е с информативен характер. При разминавания български текст има предимство.',
    tabs: { bg: 'Български (официален)', ru: 'Русский', uk: 'Українська', en: 'English' },
  },
}

const BG_TEXT = `
1. Администратор на лични данни

Администратор на личните данни, обработвани чрез TaxBG Pro, е: {{COMPANY_NAME}}, ЕИК {{COMPANY_EIK}}, със седалище и адрес на управление: {{COMPANY_ADDRESS}}, електронна поща за връзка: {{CONTACT_EMAIL}}.

2. Какви данни събираме

При използване на TaxBG Pro събираме и обработваме следните категории лични данни:
• Електронна поща — за регистрация, вход и възстановяване на достъп до акаунта.
• Имена и ЕГН на служители — необходими за изготвяне на Образец 1, ведомости и осигурителни декларации.
• Данни за трудови възнаграждения — брутна заплата, осигурителна база, удръжки, нетна сума.
• Финансови данни на дружества — транзакции, приходи, разходи, банкови движения, въведени от потребителя.
• ЕИК, ДДС номер, седалище и адрес на дружества, управлявани в системата.
• Технически данни — IP адрес, тип на браузъра, операционна система, бисквитки (cookies), лог-данни за вход.

3. Основание за обработка (чл. 6 от Регламент (ЕС) 2016/679 — GDPR)

Обработваме лични данни на едно или повече от следните основания:
• Изпълнение на договор (чл. 6, ал. 1, буква „б") — за предоставяне на заявената услуга TaxBG Pro.
• Законово задължение (чл. 6, ал. 1, буква „в") — за спазване на счетоводни, данъчни и осигурителни задължения, произтичащи от Закона за счетоводството (ЗСч), Кодекса за социално осигуряване (КСО), Закона за данъка върху добавената стойност (ЗДДС), Закона за данъците върху доходите на физическите лица (ЗДДФЛ) и други относими нормативни актове.
• Съгласие (чл. 6, ал. 1, буква „а") — за бисквитки, които не са строго необходими, и за маркетингови съобщения, ако такива се изпращат.
• Легитимен интерес (чл. 6, ал. 1, буква „е") — за защита срещу измами, злоупотреба и нерегламентиран достъп до системата.

4. Срок на съхранение

Личните данни се съхраняват само за срока, необходим за постигане на целите, за които са събрани, и за срока, в който закон изисква тяхното съхранение:
• Счетоводни документи и регистри — 10 години (чл. 12 от ЗСч).
• Ведомости за заплати и документи, свързани с осигурителен стаж — 50 години (чл. 12 от ЗСч; Наредба за реда за избор на осигуряване).
• Данни за потребителски акаунт — до закриване на акаунта и 1 (една) година след това, освен в случаите, когато закон изисква по-дълго съхранение.
• На сървърите на TaxBG Pro: максимум 1 (една) година. TaxBG Pro не е архив. Потребителят е длъжен сам да изтегля и съхранява счетоводната и кадровата документация за законово изискуемия срок, чрез функцията „Експорт" / /vault.

5. Права на субекта на данни (чл. 15–22 от GDPR)

Всеки субект на данни има следните права:
• Право на достъп (чл. 15) — да получи информация дали се обработват негови лични данни, и копие от тях.
• Право на коригиране (чл. 16) — да поиска корекция на неточни или непълни данни.
• Право на изтриване / „да бъде забравен" (чл. 17) — с ограничение: данни, които законът задължава администратора да съхранява за определен срок (например ведомости, счетоводни регистри), не се изтриват преди изтичане на този срок.
• Право на ограничаване на обработването (чл. 18).
• Право на преносимост (чл. 20) — реализирано чрез функцията ZIP-експорт в раздел /vault.
• Право на възражение срещу обработването (чл. 21).
• Право на жалба до надзорния орган — Комисия за защита на личните данни (КЗЛД), гр. София, бул. „Проф. Цветан Лазаров" № 2, kzld.bg.

Исканията се отправят писмено на адреса или електронната поща, посочени в т. 1. Отговор се предоставя в срок от 1 месец, с възможност за удължаване при сложни случаи съгласно чл. 12, ал. 3 от GDPR.

6. Предаване на данни на трети лица

За осигуряване на функционирането на услугата предоставяме лични данни на следните категории обработващи и получатели:
• Supabase Inc. — доставчик на хостинг и база данни. Данните се обработват в регион на Европейския съюз.
• Доставчик на голям езиков модел (OpenRouter / OpenAI / Anthropic) — САМО в случай, че потребителят изрично е конфигурирал собствен API ключ в настройките на приложението. В този случай към доставчика не се изпращат сурови лични данни — предават се само агрегирани суми и обобщена информация, необходима за отговора на запитването.
• Компетентни държавни органи — само в случаите, в които това е предвидено от закон.

TaxBG Pro НЕ продава и НЕ споделя лични данни за маркетингови цели с трети лица.

7. Бисквитки (cookies)

TaxBG Pro използва строго необходими бисквитки за автентикация и поддържане на сесията. Тези бисквитки не могат да бъдат изключени, без услугата да престане да работи. Повече информация — в Cookie Policy, налична при първо зареждане на приложението (Cookie банер).

8. Използване на изкуствен интелект

За прозрачно разкриване на използването на AI системи, моля, вижте Декларацията за използване на изкуствен интелект на страница /ai-disclosure.

9. Сигурност на данните

TaxBG Pro прилага технически и организационни мерки за защита на личните данни, включително криптиране на връзката (HTTPS/TLS), Row Level Security (RLS) на ниво база данни, ролеви модел за достъп и журнал на действията (audit log).

10. Контакт за въпроси

За въпроси относно обработването на лични данни, както и за упражняване на правата по GDPR, потребителят може да се свърже на: {{CONTACT_EMAIL}}.

Настоящата политика може да бъде актуализирана. Актуалната версия е винаги достъпна на адрес /privacy.
`.trim()

const RU_TEXT = `
1. Администратор персональных данных

Администратором персональных данных, обрабатываемых через TaxBG Pro, является: {{COMPANY_NAME}}, ЕИК {{COMPANY_EIK}}, юридический адрес: {{COMPANY_ADDRESS}}, email для связи: {{CONTACT_EMAIL}}.

2. Какие данные мы собираем

• Email — для регистрации, входа и восстановления доступа.
• Имена и ЕГН сотрудников — для формирования Образеца 1, ведомостей и страховых деклараций.
• Данные о зарплатах — брутто, страховая база, удержания, нетто.
• Финансовые данные компаний — транзакции, доходы, расходы, банковские движения, введённые пользователем.
• ЕИК, НДС-номер, адрес компаний, управляемых в системе.
• Технические данные — IP-адрес, тип браузера, ОС, cookies, логи входа.

3. Основание обработки (ст. 6 GDPR)

• Исполнение договора (ст. 6, п. 1, "b") — для предоставления услуги TaxBG Pro.
• Законное обязательство (ст. 6, п. 1, "c") — для соблюдения бухгалтерских, налоговых и страховых требований по ЗСч, КСО, ЗДДС, ЗДДФЛ.
• Согласие (ст. 6, п. 1, "a") — для cookies, не являющихся строго необходимыми, и маркетинговых сообщений.
• Законный интерес (ст. 6, п. 1, "f") — защита от мошенничества и несанкционированного доступа.

4. Срок хранения

• Бухгалтерские документы — 10 лет (ст. 12 ЗСч).
• Зарплатные ведомости и документы стажа — 50 лет (ст. 12 ЗСч).
• Аккаунт пользователя — до закрытия аккаунта + 1 год.
• На серверах TaxBG Pro данные хранятся максимум 1 год. Пользователь обязан сам скачивать и хранить документы весь установленный законом срок через функцию "Экспорт" / /vault.

5. Права субъекта данных (ст. 15–22 GDPR)

• Право на доступ (ст. 15)
• Право на исправление (ст. 16)
• Право на удаление / "быть забытым" (ст. 17) — с ограничением: данные, которые закон обязывает хранить, не удаляются до истечения срока.
• Право на ограничение обработки (ст. 18)
• Право на переносимость (ст. 20) — реализовано через ZIP-экспорт в разделе /vault.
• Право на возражение (ст. 21)
• Право на жалобу в Комиссию по защите персональных данных (КЗЛД), София, kzld.bg.

6. Передача данных третьим лицам

• Supabase Inc. — хостинг и БД, регион ЕС.
• Поставщик LLM (OpenRouter / OpenAI / Anthropic) — ТОЛЬКО если пользователь настроил собственный API-ключ. В провайдера НЕ отправляются сырые персональные данные, только агрегированные суммы.
• Компетентные госорганы — только по закону.

TaxBG Pro НЕ продаёт и НЕ передаёт данные для маркетинга.

7. Cookies

Используются строго необходимые cookies для аутентификации и сессии. См. Cookie-баннер.

8. Использование ИИ

См. AI Disclosure на /ai-disclosure.

9. Безопасность

HTTPS/TLS, RLS в БД, ролевая модель доступа, audit log.

10. Контакт

{{CONTACT_EMAIL}}
`.trim()

const UK_TEXT = `
1. Адміністратор персональних даних

Адміністратор персональних даних, які обробляються через TaxBG Pro: {{COMPANY_NAME}}, ЕІК {{COMPANY_EIK}}, юридична адреса: {{COMPANY_ADDRESS}}, email для зв'язку: {{CONTACT_EMAIL}}.

2. Які дані ми збираємо

• Email — для реєстрації, входу та відновлення доступу.
• Імена та ЄГН співробітників — для Зразка 1, відомостей та страхових декларацій.
• Дані про зарплати — брутто, страхова база, утримання, нетто.
• Фінансові дані компаній — транзакції, доходи, витрати, банківські рухи, введені користувачем.
• ЕІК, ПДВ-номер, адреса компаній.
• Технічні дані — IP, браузер, ОС, cookies, логи входу.

3. Підстава обробки (ст. 6 GDPR)

• Виконання договору (ст. 6, п. 1, "b").
• Законодавчий обов'язок (ст. 6, п. 1, "c") — ЗСч, КСО, ЗДДС, ЗДДФО.
• Згода (ст. 6, п. 1, "a") — для необов'язкових cookies та маркетингу.
• Законний інтерес (ст. 6, п. 1, "f") — захист від зловживань.

4. Термін зберігання

• Бухгалтерські документи — 10 років (ст. 12 ЗСч).
• Відомості про зарплату та стаж — 50 років.
• Акаунт — до закриття + 1 рік.
• На серверах TaxBG Pro: максимум 1 рік. Користувач зобов'язаний самостійно завантажувати та зберігати документи через /vault.

5. Права суб'єкта даних (ст. 15–22 GDPR)

• Право на доступ, виправлення, видалення (з обмеженнями), обмеження обробки, перенесення (через ZIP-експорт у /vault), заперечення.
• Право на скаргу до КЗЛД (kzld.bg).

6. Передача третім особам

• Supabase Inc. — хостинг ЄС.
• LLM-провайдер (OpenRouter / OpenAI / Anthropic) — ТІЛЬКИ якщо користувач налаштував власний API-ключ. Сирі персональні дані не передаються, лише агреговані суми.
• Державні органи — лише за законом.

TaxBG Pro НЕ продає та НЕ передає дані для маркетингу.

7. Cookies

Використовуються лише строго необхідні cookies. Див. Cookie-банер.

8. Використання ШІ

Див. AI Disclosure на /ai-disclosure.

9. Безпека

HTTPS/TLS, RLS у БД, рольова модель доступу, audit log.

10. Контакт

{{CONTACT_EMAIL}}
`.trim()

const EN_TEXT = `
1. Data Controller

The controller of personal data processed through TaxBG Pro is: {{COMPANY_NAME}}, UIC {{COMPANY_EIK}}, registered address: {{COMPANY_ADDRESS}}, contact email: {{CONTACT_EMAIL}}.

2. Data We Collect

• Email — for registration, login and account recovery.
• Employee names and personal ID (ЕГН) — required for Bulgarian Form 1, payroll and social-security filings.
• Payroll data — gross salary, social-security base, withholdings, net.
• Company financial data — transactions, income, expenses, bank movements entered by the user.
• UIC, VAT number, registered office of companies managed in the system.
• Technical data — IP address, browser type, OS, cookies, login logs.

3. Legal Basis (Art. 6 GDPR)

• Contract performance (Art. 6(1)(b)) — to deliver the TaxBG Pro service.
• Legal obligation (Art. 6(1)(c)) — compliance with Bulgarian accounting, tax and social-security law (ЗСч, КСО, ЗДДС, ЗДДФЛ).
• Consent (Art. 6(1)(a)) — non-essential cookies and marketing.
• Legitimate interest (Art. 6(1)(f)) — fraud prevention and system security.

4. Retention

• Accounting documents — 10 years (Art. 12 ЗСч).
• Payroll records and length-of-service documents — 50 years.
• User account data — until account closure + 1 year.
• On TaxBG Pro servers: no more than 1 (one) year. TaxBG Pro is not an archive. Users must download and store their own records for the legally required period via the Export / /vault feature.

5. Data Subject Rights (Art. 15–22 GDPR)

• Right of access, rectification, erasure (with the limitation that data required by law must be retained for the statutory term), restriction, portability (ZIP export in /vault), objection.
• Right to lodge a complaint with the Bulgarian Commission for Personal Data Protection (CPDP / КЗЛД, kzld.bg).

6. Third-Party Transfers

• Supabase Inc. — hosting and database, EU region.
• LLM provider (OpenRouter / OpenAI / Anthropic) — ONLY if the user has configured their own API key. Raw personal data is not transmitted — only aggregated totals necessary for the query.
• Competent public authorities — only as required by law.

TaxBG Pro does NOT sell or share personal data for marketing purposes.

7. Cookies

Only strictly necessary cookies are used (authentication, session). See the Cookie banner shown on first visit.

8. Use of AI

See the AI Disclosure at /ai-disclosure.

9. Security

HTTPS/TLS, database-level Row Level Security (RLS), role-based access, audit log.

10. Contact

{{CONTACT_EMAIL}}
`.trim()

const BODIES: Record<DocLang, string> = {
  bg: BG_TEXT,
  ru: RU_TEXT,
  uk: UK_TEXT,
  en: EN_TEXT,
}

export default function Privacy() {
  const language = useUserStore((s) => s.language)
  const ui = TRANSLATIONS[language] ?? TRANSLATIONS.ru
  const [tab, setTab] = useState<DocLang>('bg')

  return (
    <div className="min-h-screen px-4 py-10" style={{ backgroundColor: 'var(--surface)' }}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between text-sm">
          <Link to="/" className="text-blue-600 hover:underline">{ui.backHome}</Link>
          <Link to="/terms" className="text-slate-500 hover:underline">Terms</Link>
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
