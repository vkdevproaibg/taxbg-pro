// ═══════════════════════════════════════════════════════════
// Audit templates — static explanatory notes that can be
// generated on demand when a НАП/НОИ inspector asks a typical
// question. The Bulgarian text is the authoritative document
// (that's what the inspector reads). The ru/en/uk variants are
// a translation for the user so they understand what they are
// handing over.
//
// Placeholders use {{name}} syntax and MUST be identical
// across all four language variants so the substitution layer
// stays trivial.
// ═══════════════════════════════════════════════════════════

export type AuditLang = 'ru' | 'en' | 'bg' | 'uk'

export interface AuditTemplate {
  id: string
  category: 'vat' | 'osig' | 'zkpo' | 'labor' | 'accounting'
  question: Record<AuditLang, string>
  hint: Record<AuditLang, string>
  template_bg: string
  template_ru: string
  template_en: string
  template_uk: string
  required_data: string[]
  applicable: {
    legalForms: Array<'ood' | 'et' | 'self'>
    hasVat?: boolean
    hasEmployees?: boolean
  }
}

export const AUDIT_TEMPLATES: AuditTemplate[] = [
  // ─────────────────────────────────────────────────────────
  // 1. VAT — not registered
  // ─────────────────────────────────────────────────────────
  {
    id: 'vat-not-registered',
    category: 'vat',
    question: {
      ru: 'Почему компания не зарегистрирована по ДДС?',
      en: "Why isn't the company VAT registered?",
      bg: 'Защо дружеството не е регистрирано по ДДС?',
      uk: 'Чому компанія не зареєстрована з ДДВ?',
    },
    hint: {
      ru: 'Используйте если компания ведёт деятельность без ДДС регистрации и оборот ниже порога.',
      en: 'Use when the company operates without VAT registration and turnover is below the threshold.',
      bg: 'Използвайте когато дружеството работи без ДДС регистрация и оборотът е под прага.',
      uk: 'Використовуйте, коли компанія працює без реєстрації ДДВ і оборот нижчий за поріг.',
    },
    template_bg:
`ДО
ТД на НАП — {{today}}

ОБЯСНИТЕЛНА ЗАПИСКА

Относно: Статус по ЗДДС на дружеството {{companyName}}, ЕИК {{eik}}

Уважаеми г-н/г-жо инспектор,

Дружеството {{companyName}} с ЕИК {{eik}} не е регистрирано по Закона за данък върху добавената стойност (ЗДДС), тъй като облагаемият оборот за последните 12 месеца (период {{periodFrom}} — {{periodTo}}) възлиза на {{totalRevenue}} € и не е достигнал прага за задължителна регистрация от {{vatThreshold}} €, установен в чл. 96 ал. 1 от ЗДДС (съответстващ на Директива 2006/112/ЕО на Съвета).

Дружеството следи оборота си ежемесечно и ще подаде заявление за регистрация в 7-дневен срок от момента на достигане на прага.

Приложения: справка за оборота по месеци за периода {{periodFrom}} — {{periodTo}}.

С уважение,
{{ownerName}}
Управител на {{companyName}}`,
    template_ru:
`КОМУ
ТД НАП — {{today}}

ОБЪЯСНИТЕЛНАЯ ЗАПИСКА

Тема: Статус по ЗДДС компании {{companyName}}, ЕИК {{eik}}

Уважаемый инспектор,

Компания {{companyName}}, ЕИК {{eik}}, не зарегистрирована по Закону о налоге на добавленную стоимость (ЗДДС), так как облагаемый оборот за последние 12 месяцев (период {{periodFrom}} — {{periodTo}}) составляет {{totalRevenue}} € и не достиг порога обязательной регистрации {{vatThreshold}} €, установленного ст. 96 ч. 1 ЗДДС (соответствующего Директиве 2006/112/ЕС).

Компания отслеживает оборот ежемесячно и подаст заявление о регистрации в течение 7 дней с момента достижения порога.

Приложения: справка по обороту по месяцам за период {{periodFrom}} — {{periodTo}}.

С уважением,
{{ownerName}}
Управляющий {{companyName}}`,
    template_en:
`TO
NRA Territorial Directorate — {{today}}

EXPLANATORY NOTE

Subject: VAT status of {{companyName}}, UIC {{eik}}

Dear Inspector,

The company {{companyName}}, UIC {{eik}}, is not registered under the Bulgarian VAT Act (ZDDS), as its taxable turnover for the last 12 months ({{periodFrom}} — {{periodTo}}) amounts to {{totalRevenue}} € and has not reached the mandatory registration threshold of {{vatThreshold}} € set in Art. 96 para. 1 ZDDS (implementing Council Directive 2006/112/EC).

The company monitors its turnover monthly and will file a registration application within 7 days of reaching the threshold.

Enclosure: monthly turnover report for the period {{periodFrom}} — {{periodTo}}.

Yours faithfully,
{{ownerName}}
Manager of {{companyName}}`,
    template_uk:
`КОМУ
ТД НАП — {{today}}

ПОЯСНЮВАЛЬНА ЗАПИСКА

Тема: Статус за ЗДДВ компанії {{companyName}}, ЄІК {{eik}}

Шановний інспекторе,

Компанія {{companyName}}, ЄІК {{eik}}, не зареєстрована за Законом про податок на додану вартість (ЗДДВ), оскільки оподатковуваний оборот за останні 12 місяців ({{periodFrom}} — {{periodTo}}) становить {{totalRevenue}} € і не досяг порогу обов'язкової реєстрації {{vatThreshold}} €, встановленого ст. 96 ч. 1 ЗДДВ (що відповідає Директиві 2006/112/ЄС).

Компанія щомісяця відстежує свій оборот і подасть заяву про реєстрацію протягом 7 днів з моменту досягнення порогу.

Додатки: довідка про оборот за місяцями за період {{periodFrom}} — {{periodTo}}.

З повагою,
{{ownerName}}
Керуючий {{companyName}}`,
    required_data: ['companyName', 'eik', 'totalRevenue', 'vatThreshold', 'periodFrom', 'periodTo', 'ownerName', 'today'],
    applicable: { legalForms: ['ood', 'et'], hasVat: false },
  },

  // ─────────────────────────────────────────────────────────
  // 2. VAT — threshold exceeded
  // ─────────────────────────────────────────────────────────
  {
    id: 'vat-threshold-exceeded',
    category: 'vat',
    question: {
      ru: 'Превышен порог для ДДС регистрации — почему не подано заявление?',
      en: 'The VAT threshold has been exceeded — why no application filed?',
      bg: 'Превишен е прагът за ДДС регистрация — защо не сте подали заявление?',
      uk: 'Перевищено поріг реєстрації ДДВ — чому не подано заяви?',
    },
    hint: {
      ru: 'Оборот превысил 51 130 €. Нужно заявление в 7-дневный срок.',
      en: 'Turnover has exceeded the VAT threshold. A registration application is required within 7 days.',
      bg: 'Оборотът е над прага. В 7-дневен срок се подава заявление за регистрация.',
      uk: 'Оборот перевищив поріг. Протягом 7 днів слід подати заяву про реєстрацію.',
    },
    template_bg:
`ОБЯСНИТЕЛНА ЗАПИСКА — {{today}}

Относно: Заявление за регистрация по ЗДДС на {{companyName}}, ЕИК {{eik}}

Дружеството {{companyName}} уведомява, че облагаемият оборот за последните 12 месеца ({{periodFrom}} — {{periodTo}}) е достигнал {{totalRevenue}} €, което надвишава прага от {{vatThreshold}} € по чл. 96 ал. 1 ЗДДС.

Заявление за регистрация по ЗДДС е подадено/ще бъде подадено в 7-дневния срок, предвиден в чл. 96 ал. 1 ЗДДС, считано от края на месеца, в който е надвишен прагът.

С уважение,
{{ownerName}}
Управител на {{companyName}}`,
    template_ru:
`ОБЪЯСНИТЕЛНАЯ ЗАПИСКА — {{today}}

Тема: Заявление о регистрации по ЗДДС компании {{companyName}}, ЕИК {{eik}}

Компания {{companyName}} сообщает, что облагаемый оборот за последние 12 месяцев ({{periodFrom}} — {{periodTo}}) достиг {{totalRevenue}} €, что превышает порог {{vatThreshold}} € по ст. 96 ч. 1 ЗДДС.

Заявление о регистрации по ЗДДС подано/будет подано в 7-дневный срок по ст. 96 ч. 1 ЗДДС, отсчитываемый от конца месяца, в котором превышен порог.

С уважением,
{{ownerName}}
Управляющий {{companyName}}`,
    template_en:
`EXPLANATORY NOTE — {{today}}

Subject: VAT registration application for {{companyName}}, UIC {{eik}}

The company {{companyName}} reports that its taxable turnover for the last 12 months ({{periodFrom}} — {{periodTo}}) has reached {{totalRevenue}} €, exceeding the threshold of {{vatThreshold}} € set in Art. 96 para. 1 ZDDS.

A VAT registration application has been / will be filed within the 7-day period required by Art. 96 para. 1 ZDDS, counted from the end of the month in which the threshold was exceeded.

Yours faithfully,
{{ownerName}}
Manager of {{companyName}}`,
    template_uk:
`ПОЯСНЮВАЛЬНА ЗАПИСКА — {{today}}

Тема: Заява про реєстрацію за ЗДДВ компанії {{companyName}}, ЄІК {{eik}}

Компанія {{companyName}} повідомляє, що оподатковуваний оборот за останні 12 місяців ({{periodFrom}} — {{periodTo}}) досяг {{totalRevenue}} €, що перевищує поріг {{vatThreshold}} € згідно ст. 96 ч. 1 ЗДДВ.

Заяву про реєстрацію за ЗДДВ подано/буде подано у 7-денний строк за ст. 96 ч. 1 ЗДДВ, що обчислюється з кінця місяця, в якому було перевищено поріг.

З повагою,
{{ownerName}}
Керуючий {{companyName}}`,
    required_data: ['companyName', 'eik', 'totalRevenue', 'vatThreshold', 'periodFrom', 'periodTo', 'ownerName', 'today'],
    applicable: { legalForms: ['ood', 'et'], hasVat: false },
  },

  // ─────────────────────────────────────────────────────────
  // 3. Osig — base correct
  // ─────────────────────────────────────────────────────────
  {
    id: 'osig-base-correct',
    category: 'osig',
    question: {
      ru: 'Правильно ли определена осигурительная база?',
      en: 'Has the social security base been determined correctly?',
      bg: 'Правилно ли е определена осигурителната база?',
      uk: 'Чи правильно визначено базу для соціальних внесків?',
    },
    hint: {
      ru: 'Обяснение методики расчёта осигурительной базы по КСО.',
      en: 'Explains how the social security base is computed under the Social Insurance Code.',
      bg: 'Обяснение на методиката за определяне на осигурителната база по КСО.',
      uk: 'Пояснення методики визначення бази для внесків за КСО.',
    },
    template_bg:
`ОБЯСНИТЕЛНА ЗАПИСКА — {{today}}

Относно: Определяне на осигурителната база на {{companyName}}, ЕИК {{eik}}

Осигурителната база на дружеството е определена съгласно чл. 6 от Кодекса за социално осигуряване (КСО):

1. За наетите лица — върху брутното трудово възнаграждение, но не по-високо от максималния осигурителен доход, определен със ЗБДОО — {{maxOsig}} € месечно.
2. За самоосигуряващите се лица — върху избрания осигурителен доход, но не по-малък от минималния осигурителен доход за самоосигуряващи се — {{minOsigSol}} € месечно, и не по-висок от максималния — {{maxOsig}} € месечно.

Вноските са разпределени в съотношенията, предвидени в КСО и ЗЗО, съгласно действащите ставки към периода на възнаграждението.

С уважение,
{{ownerName}}
Управител на {{companyName}}`,
    template_ru:
`ОБЪЯСНИТЕЛНАЯ ЗАПИСКА — {{today}}

Тема: Определение осигурительной базы {{companyName}}, ЕИК {{eik}}

Осигурительная база компании определена в соответствии со ст. 6 Кодекса социального осигурования (КСО):

1. Для наёмных работников — на брутто-зарплату, но не выше максимального осигурительного дохода, установленного ЗБДОО — {{maxOsig}} € в месяц.
2. Для самозанятых лиц — на выбранный осигурительный доход, но не ниже минимума для самозанятых {{minOsigSol}} € в месяц и не выше максимума {{maxOsig}} € в месяц.

Взносы распределены в долях, предусмотренных КСО и ЗЗО, согласно действующим ставкам на период выплаты.

С уважением,
{{ownerName}}
Управляющий {{companyName}}`,
    template_en:
`EXPLANATORY NOTE — {{today}}

Subject: Social insurance base for {{companyName}}, UIC {{eik}}

The social insurance base is determined in accordance with Art. 6 of the Social Insurance Code (KSO):

1. For employees — the gross salary, but not exceeding the maximum insurable income set by the State Social Insurance Budget Act — {{maxOsig}} € per month.
2. For self-employed persons — the chosen insurable income, but not lower than the minimum for self-employed ({{minOsigSol}} €/month) and not higher than the maximum ({{maxOsig}} €/month).

Contributions are split in the proportions prescribed by KSO and ZZO, using the rates in force for the period of the payment.

Yours faithfully,
{{ownerName}}
Manager of {{companyName}}`,
    template_uk:
`ПОЯСНЮВАЛЬНА ЗАПИСКА — {{today}}

Тема: Визначення бази соціальних внесків {{companyName}}, ЄІК {{eik}}

Базу для соціальних внесків визначено відповідно до ст. 6 Кодексу соціального страхування (КСО):

1. Для найманих працівників — на брутто-зарплату, але не вище максимуму, встановленого ЗБДОО — {{maxOsig}} € на місяць.
2. Для самозайнятих — на обраний страховий дохід, але не нижче мінімуму для самозайнятих ({{minOsigSol}} €/міс) і не вище максимуму ({{maxOsig}} €/міс).

Внески розподілені у частках, передбачених КСО та ЗЗО, за діючими ставками на період виплати.

З повагою,
{{ownerName}}
Керуючий {{companyName}}`,
    required_data: ['companyName', 'eik', 'maxOsig', 'minOsigSol', 'ownerName', 'today'],
    applicable: { legalForms: ['ood', 'et', 'self'] },
  },

  // ─────────────────────────────────────────────────────────
  // 4. Labor — min wage
  // ─────────────────────────────────────────────────────────
  {
    id: 'osig-min-wage',
    category: 'labor',
    question: {
      ru: 'Соблюдается ли минимальная зарплата?',
      en: 'Is the minimum wage being observed?',
      bg: 'Спазена ли е минималната работна заплата?',
      uk: 'Чи дотримується мінімальна заробітна плата?',
    },
    hint: {
      ru: 'Подтверждение что все сотрудники получают не менее МРЗ.',
      en: 'Confirms all employees receive at least the minimum wage.',
      bg: 'Потвърждение, че всички служители получават не по-малко от МРЗ.',
      uk: 'Підтвердження, що всі працівники отримують не менше МЗП.',
    },
    template_bg:
`ОБЯСНИТЕЛНА ЗАПИСКА — {{today}}

Относно: Спазване на МРЗ от {{companyName}}, ЕИК {{eik}}

Всички служители на дружеството {{companyName}} получават брутно трудово възнаграждение не по-малко от минималната работна заплата за страната — {{minWage}} € месечно, определена с ПМС №243/2025 г., съгласно чл. 244 от Кодекса на труда.

Приложение: ведомост за заплати за текущия месец.

С уважение,
{{ownerName}}
Управител на {{companyName}}`,
    template_ru:
`ОБЪЯСНИТЕЛНАЯ ЗАПИСКА — {{today}}

Тема: Соблюдение МРЗ компанией {{companyName}}, ЕИК {{eik}}

Все работники компании {{companyName}} получают брутто-зарплату не ниже минимальной заработной платы для Болгарии — {{minWage}} € в месяц, установленной ПМС №243/2025 г., в соответствии со ст. 244 Кодекса труда.

Приложение: ведомость по заработной плате за текущий месяц.

С уважением,
{{ownerName}}
Управляющий {{companyName}}`,
    template_en:
`EXPLANATORY NOTE — {{today}}

Subject: Minimum wage compliance of {{companyName}}, UIC {{eik}}

All employees of {{companyName}} receive a gross salary of at least the statutory minimum wage — {{minWage}} € per month, set by Council of Ministers Decree No. 243/2025, in accordance with Art. 244 of the Labour Code.

Enclosure: current month's payroll ledger.

Yours faithfully,
{{ownerName}}
Manager of {{companyName}}`,
    template_uk:
`ПОЯСНЮВАЛЬНА ЗАПИСКА — {{today}}

Тема: Дотримання МЗП компанією {{companyName}}, ЄІК {{eik}}

Усі працівники компанії {{companyName}} отримують брутто-заробітну плату не менше мінімальної заробітної плати — {{minWage}} € на місяць, встановленої ПМС №243/2025 р., відповідно до ст. 244 Кодексу праці.

Додаток: відомість заробітної плати за поточний місяць.

З повагою,
{{ownerName}}
Керуючий {{companyName}}`,
    required_data: ['companyName', 'eik', 'minWage', 'ownerName', 'today'],
    applicable: { legalForms: ['ood', 'et'], hasEmployees: true },
  },

  // ─────────────────────────────────────────────────────────
  // 5. ZKPO — non-deductible
  // ─────────────────────────────────────────────────────────
  {
    id: 'zkpo-non-deductible',
    category: 'zkpo',
    question: {
      ru: 'Есть ли непризнаваемые расходы по ЗКПО?',
      en: 'Are there any non-deductible expenses under the Corporate Income Tax Act?',
      bg: 'Има ли непризнати разходи по ЗКПО?',
      uk: 'Чи є невизнані витрати за ЗКПО?',
    },
    hint: {
      ru: 'Объяснение применения ст. 26 ЗКПО для смешанного использования автомобиля.',
      en: 'Explains application of ZKPO Art. 26 for mixed-use vehicle expenses.',
      bg: 'Обяснение на прилагането на чл. 26 ЗКПО за смесено ползван автомобил.',
      uk: 'Пояснення застосування ст. 26 ЗКПО для змішаного використання автомобіля.',
    },
    template_bg:
`ОБЯСНИТЕЛНА ЗАПИСКА — {{today}}

Относно: Данъчна основа по ЗКПО на {{companyName}}, ЕИК {{eik}}

При определяне на годишната данъчна основа за {{currentYear}} г. по ЗКПО дружеството е приложило чл. 26 от ЗКПО, като е намалило признатите разходи със стойността на непризнатите разходи за лично ползване на фирмено МПС.

Непризната сума за периода: {{nonDeductible}} €
Финансов резултат: {{financialResult}} €
Данъчна печалба: {{taxableProfit}} €
Корпоративен данък (10%): {{corporateTax}} €

Приложение: справка за личното ползване на МПС.

С уважение,
{{ownerName}}
Управител на {{companyName}}`,
    template_ru:
`ОБЪЯСНИТЕЛНАЯ ЗАПИСКА — {{today}}

Тема: Налоговая база по ЗКПО компании {{companyName}}, ЕИК {{eik}}

При определении годовой налоговой базы за {{currentYear}} г. по ЗКПО компания применила ст. 26 ЗКПО, уменьшив признаваемые расходы на сумму непризнаваемых расходов за личное использование служебного автомобиля.

Непризнаваемая сумма за период: {{nonDeductible}} €
Финансовый результат: {{financialResult}} €
Налоговая прибыль: {{taxableProfit}} €
Корпоративный налог (10%): {{corporateTax}} €

Приложение: справка о личном использовании МПС.

С уважением,
{{ownerName}}
Управляющий {{companyName}}`,
    template_en:
`EXPLANATORY NOTE — {{today}}

Subject: ZKPO tax base of {{companyName}}, UIC {{eik}}

When determining the annual tax base for {{currentYear}} under the Corporate Income Tax Act (ZKPO), the company has applied Art. 26 ZKPO, reducing deductible expenses by the amount attributable to private use of the company vehicle.

Non-deductible amount for the period: {{nonDeductible}} €
Financial result: {{financialResult}} €
Taxable profit: {{taxableProfit}} €
Corporate income tax (10%): {{corporateTax}} €

Enclosure: vehicle private-use report.

Yours faithfully,
{{ownerName}}
Manager of {{companyName}}`,
    template_uk:
`ПОЯСНЮВАЛЬНА ЗАПИСКА — {{today}}

Тема: Податкова база за ЗКПО компанії {{companyName}}, ЄІК {{eik}}

При визначенні річної податкової бази за {{currentYear}} р. за ЗКПО компанія застосувала ст. 26 ЗКПО, зменшивши визнані витрати на суму невизнаних витрат за особисте використання службового автомобіля.

Невизнана сума за період: {{nonDeductible}} €
Фінансовий результат: {{financialResult}} €
Оподатковуваний прибуток: {{taxableProfit}} €
Корпоративний податок (10%): {{corporateTax}} €

Додаток: довідка про особисте використання МПС.

З повагою,
{{ownerName}}
Керуючий {{companyName}}`,
    required_data: ['companyName', 'eik', 'nonDeductible', 'financialResult', 'taxableProfit', 'corporateTax', 'currentYear', 'ownerName', 'today'],
    applicable: { legalForms: ['ood'] },
  },

  // ─────────────────────────────────────────────────────────
  // 6. ZKPO — dividend
  // ─────────────────────────────────────────────────────────
  {
    id: 'zkpo-dividend',
    category: 'zkpo',
    question: {
      ru: 'Почему начислен/выплачен дивидент?',
      en: 'Why was a dividend accrued / paid out?',
      bg: 'Защо е начислен/изплатен дивидент?',
      uk: 'Чому нараховано/виплачено дивіденд?',
    },
    hint: {
      ru: 'Подтверждение легальности выплаты дивиденда из чистой прибыли.',
      en: 'Confirms the dividend was paid from net profit after corporate tax.',
      bg: 'Потвърждение, че дивидентът е от чистата печалба след ЗКПО.',
      uk: 'Підтвердження, що дивіденд виплачено з чистого прибутку після ЗКПО.',
    },
    template_bg:
`ОБЯСНИТЕЛНА ЗАПИСКА — {{today}}

Относно: Разпределение на дивидент от {{companyName}}, ЕИК {{eik}}

Дивидентът е начислен от неразпределената печалба на дружеството след облагане с корпоративен данък по ЗКПО.

Чиста печалба за разпределение: {{netProfit}} €
Начислен дивидент: {{dividendAmount}} €
Данък дивидент 5% (чл. 38 ал. 2 ЗДДФЛ): {{dividendTax}} €

Дивидентът е изплатен на съдружника {{ownerName}}, ЕГН/ЛНЧ {{ownerEgn}}. Данъкът върху дивидента е удържан от изплащащото дружество и ще бъде деклариран и преведен в НАП по реда на чл. 65 ал. 3 ЗДДФЛ.

С уважение,
{{ownerName}}
Управител на {{companyName}}`,
    template_ru:
`ОБЪЯСНИТЕЛНАЯ ЗАПИСКА — {{today}}

Тема: Распределение дивидента от {{companyName}}, ЕИК {{eik}}

Дивидент начислен из нераспределённой прибыли компании после налогообложения корпоративным налогом по ЗКПО.

Чистая прибыль к распределению: {{netProfit}} €
Начисленный дивидент: {{dividendAmount}} €
Налог на дивидент 5% (ст. 38 ч. 2 ЗДДФЛ): {{dividendTax}} €

Дивидент выплачен участнику {{ownerName}}, ЕГН/ЛНЧ {{ownerEgn}}. Налог на дивидент удержан выплачивающей компанией и будет задекларирован и перечислен в НАП в порядке ст. 65 ч. 3 ЗДДФЛ.

С уважением,
{{ownerName}}
Управляющий {{companyName}}`,
    template_en:
`EXPLANATORY NOTE — {{today}}

Subject: Dividend distribution by {{companyName}}, UIC {{eik}}

The dividend was accrued from retained earnings after corporate income tax under ZKPO.

Net profit available for distribution: {{netProfit}} €
Accrued dividend: {{dividendAmount}} €
Dividend tax 5% (Art. 38 para. 2 ZDDFL): {{dividendTax}} €

The dividend was paid to partner {{ownerName}}, ID {{ownerEgn}}. The dividend tax is withheld by the distributing company and will be declared and remitted to the NRA in accordance with Art. 65 para. 3 ZDDFL.

Yours faithfully,
{{ownerName}}
Manager of {{companyName}}`,
    template_uk:
`ПОЯСНЮВАЛЬНА ЗАПИСКА — {{today}}

Тема: Розподіл дивіденду {{companyName}}, ЄІК {{eik}}

Дивіденд нараховано з нерозподіленого прибутку компанії після оподаткування корпоративним податком за ЗКПО.

Чистий прибуток до розподілу: {{netProfit}} €
Нарахований дивіденд: {{dividendAmount}} €
Податок на дивіденд 5% (ст. 38 ч. 2 ЗДДФЛ): {{dividendTax}} €

Дивіденд виплачено учаснику {{ownerName}}, ЄГН/ЛНЧ {{ownerEgn}}. Податок на дивіденд утримано компанією, що виплачує, і буде задекларовано та перераховано до НАП згідно зі ст. 65 ч. 3 ЗДДФЛ.

З повагою,
{{ownerName}}
Керуючий {{companyName}}`,
    required_data: ['companyName', 'eik', 'netProfit', 'dividendAmount', 'dividendTax', 'ownerName', 'ownerEgn', 'today'],
    applicable: { legalForms: ['ood'] },
  },

  // ─────────────────────────────────────────────────────────
  // 7. Labor — DUK contract
  // ─────────────────────────────────────────────────────────
  {
    id: 'labor-contract',
    category: 'labor',
    question: {
      ru: 'Есть ли трудовой договор с управляющим?',
      en: 'Is there an employment contract with the manager?',
      bg: 'Има ли трудов договор с управителя?',
      uk: 'Чи є трудовий договір з керуючим?',
    },
    hint: {
      ru: 'ООД: управляющий обычно работает по ДУК, а не по трудовому договору.',
      en: 'OOD: the manager typically operates under a DUK contract, not a labour contract.',
      bg: 'ООД: управителят работи по Договор за управление и контрол (ДУК).',
      uk: 'ТОВ: керуючий зазвичай працює за договором ДУК, а не трудовим.',
    },
    template_bg:
`ОБЯСНИТЕЛНА ЗАПИСКА — {{today}}

Относно: Статус на управителя на {{companyName}}, ЕИК {{eik}}

Управителят на дружеството {{companyName}} — {{ownerName}}, е вписан в Търговския регистър и изпълнява функциите си на основание Договор за управление и контрол (ДУК), а не трудов договор.

Управителят се самоосигурява по реда на чл. 4 ал. 3 т. 2 от КСО върху избран осигурителен доход, не по-малък от {{minOsigSol}} € месечно и не по-висок от {{maxOsig}} € месечно.

С уважение,
{{ownerName}}
Управител на {{companyName}}`,
    template_ru:
`ОБЪЯСНИТЕЛНАЯ ЗАПИСКА — {{today}}

Тема: Статус управляющего {{companyName}}, ЕИК {{eik}}

Управляющий компании {{companyName}} — {{ownerName}} — внесён в Торговый реестр и исполняет свои функции на основании Договора об управлении и контроле (ДУК), а не трудового договора.

Управляющий самоосигурируется в порядке ст. 4 ч. 3 п. 2 КСО на выбранный осигурительный доход, не ниже {{minOsigSol}} € в месяц и не выше {{maxOsig}} € в месяц.

С уважением,
{{ownerName}}
Управляющий {{companyName}}`,
    template_en:
`EXPLANATORY NOTE — {{today}}

Subject: Manager status of {{companyName}}, UIC {{eik}}

The manager of {{companyName}} — {{ownerName}} — is registered in the Commercial Register and exercises managerial duties under a Management and Control Agreement (DUK), not a labour contract.

The manager is self-insured under Art. 4 para. 3 item 2 of the Social Insurance Code (KSO) on a chosen insurable income not below {{minOsigSol}} €/month and not above {{maxOsig}} €/month.

Yours faithfully,
{{ownerName}}
Manager of {{companyName}}`,
    template_uk:
`ПОЯСНЮВАЛЬНА ЗАПИСКА — {{today}}

Тема: Статус керуючого {{companyName}}, ЄІК {{eik}}

Керуючий компанії {{companyName}} — {{ownerName}} — внесений до Торгового реєстру і виконує свої функції на підставі Договору про управління та контроль (ДУК), а не трудового договору.

Керуючий самоосiгурюється за ст. 4 ч. 3 п. 2 КСО на обраний страховий дохід, не нижче {{minOsigSol}} €/міс і не вище {{maxOsig}} €/міс.

З повагою,
{{ownerName}}
Керуючий {{companyName}}`,
    required_data: ['companyName', 'eik', 'ownerName', 'minOsigSol', 'maxOsig', 'today'],
    applicable: { legalForms: ['ood'] },
  },

  // ─────────────────────────────────────────────────────────
  // 8. Accounting — GFO published
  // ─────────────────────────────────────────────────────────
  {
    id: 'accounting-gfo',
    category: 'accounting',
    question: {
      ru: 'Опубликован ли ГФО в БРРА?',
      en: 'Has the annual financial report been published with the Commercial Register?',
      bg: 'Публикуван ли е ГФО в БРРА?',
      uk: 'Чи опубліковано РФО у Торговому реєстрі?',
    },
    hint: {
      ru: 'Подтверждение публикации ГФО за предыдущий год.',
      en: 'Confirms filing of the annual financial report for the prior year.',
      bg: 'Потвърждение за публикуване на ГФО за предходната година.',
      uk: 'Підтвердження публікації РФО за попередній рік.',
    },
    template_bg:
`ОБЯСНИТЕЛНА ЗАПИСКА — {{today}}

Относно: ГФО за {{previousYear}} г. на {{companyName}}, ЕИК {{eik}}

Годишният финансов отчет на дружеството {{companyName}} за {{previousYear}} г. е публикуван в Агенцията по вписванията (БРРА) в срока по чл. 40 от Закона за счетоводството — до 30 юни {{currentYear}} г.

Номер на вписването: {{gfoRegistryNumber}}

При необходимост копие на ГФО може да бъде предоставено на контролния орган.

С уважение,
{{ownerName}}
Управител на {{companyName}}`,
    template_ru:
`ОБЪЯСНИТЕЛНАЯ ЗАПИСКА — {{today}}

Тема: ГФО за {{previousYear}} г. компании {{companyName}}, ЕИК {{eik}}

Годовой финансовый отчёт компании {{companyName}} за {{previousYear}} г. опубликован в Агентстве по вписаниям (БРРА) в срок по ст. 40 Закона о счетоводстве — до 30 июня {{currentYear}} г.

Номер регистрации: {{gfoRegistryNumber}}

При необходимости копия ГФО может быть предоставлена контролирующему органу.

С уважением,
{{ownerName}}
Управляющий {{companyName}}`,
    template_en:
`EXPLANATORY NOTE — {{today}}

Subject: Annual financial report for {{previousYear}} of {{companyName}}, UIC {{eik}}

The annual financial report (GFO) of {{companyName}} for {{previousYear}} has been published with the Registry Agency (BRRA) within the deadline set by Art. 40 of the Accountancy Act — by 30 June {{currentYear}}.

Registration number: {{gfoRegistryNumber}}

A copy of the report can be provided to the authority upon request.

Yours faithfully,
{{ownerName}}
Manager of {{companyName}}`,
    template_uk:
`ПОЯСНЮВАЛЬНА ЗАПИСКА — {{today}}

Тема: РФО за {{previousYear}} р. компанії {{companyName}}, ЄІК {{eik}}

Річний фінансовий звіт компанії {{companyName}} за {{previousYear}} р. опубліковано в Агентстві з реєстрації (БРРА) у строк за ст. 40 Закону про бухгалтерський облік — до 30 червня {{currentYear}} р.

Номер реєстрації: {{gfoRegistryNumber}}

За потреби копія РФО може бути надана контролюючому органу.

З повагою,
{{ownerName}}
Керуючий {{companyName}}`,
    required_data: ['companyName', 'eik', 'previousYear', 'currentYear', 'gfoRegistryNumber', 'ownerName', 'today'],
    applicable: { legalForms: ['ood'] },
  },

  // ─────────────────────────────────────────────────────────
  // 9. Accounting — balance mismatch
  // ─────────────────────────────────────────────────────────
  {
    id: 'accounting-balance',
    category: 'accounting',
    question: {
      ru: 'Почему баланс не сходится?',
      en: 'Why does the balance sheet not balance?',
      bg: 'Защо балансът не се сходи?',
      uk: 'Чому баланс не сходиться?',
    },
    hint: {
      ru: 'Объяснение расхождения в балансе и предпринятых мер.',
      en: 'Explains a balance sheet discrepancy and corrective measures.',
      bg: 'Обяснение за разлика в баланса и мерки за корекция.',
      uk: 'Пояснення розбіжності в балансі та заходів для усунення.',
    },
    template_bg:
`ОБЯСНИТЕЛНА ЗАПИСКА — {{today}}

Относно: Разлика в баланса на {{companyName}}, ЕИК {{eik}}

Балансът на дружеството {{companyName}} към {{balanceDate}} показва разлика от {{balanceDifference}} € между актива и пасива.

Причина: {{balanceReason}}

Предприети мерки: {{balanceAction}}

Корекционните записи ще бъдат отразени в текущия период съгласно НСС 8 — Нетни печалби или загуби за периода, основни грешки и промени в счетоводната политика.

С уважение,
{{ownerName}}
Управител на {{companyName}}`,
    template_ru:
`ОБЪЯСНИТЕЛНАЯ ЗАПИСКА — {{today}}

Тема: Расхождение в балансе {{companyName}}, ЕИК {{eik}}

Баланс компании {{companyName}} на {{balanceDate}} показывает разницу {{balanceDifference}} € между активом и пассивом.

Причина: {{balanceReason}}

Принятые меры: {{balanceAction}}

Корректирующие записи будут отражены в текущем периоде согласно НСС 8 — Чистые прибыли или убытки за период, фундаментальные ошибки и изменения в учётной политике.

С уважением,
{{ownerName}}
Управляющий {{companyName}}`,
    template_en:
`EXPLANATORY NOTE — {{today}}

Subject: Balance sheet discrepancy for {{companyName}}, UIC {{eik}}

The balance sheet of {{companyName}} as at {{balanceDate}} shows a difference of {{balanceDifference}} € between assets and liabilities.

Cause: {{balanceReason}}

Corrective measures: {{balanceAction}}

Correcting entries will be recorded in the current period in accordance with NAS 8 — Net Profit or Loss for the Period, Fundamental Errors and Changes in Accounting Policy.

Yours faithfully,
{{ownerName}}
Manager of {{companyName}}`,
    template_uk:
`ПОЯСНЮВАЛЬНА ЗАПИСКА — {{today}}

Тема: Розбіжність у балансі {{companyName}}, ЄІК {{eik}}

Баланс компанії {{companyName}} на {{balanceDate}} показує різницю {{balanceDifference}} € між активом та пасивом.

Причина: {{balanceReason}}

Вжиті заходи: {{balanceAction}}

Коригувальні записи будуть відображені у поточному періоді відповідно до НСС 8 — Чисті прибутки або збитки за період, основні помилки та зміни в обліковій політиці.

З повагою,
{{ownerName}}
Керуючий {{companyName}}`,
    required_data: ['companyName', 'eik', 'balanceDate', 'balanceDifference', 'balanceReason', 'balanceAction', 'ownerName', 'today'],
    applicable: { legalForms: ['ood', 'et'] },
  },

  // ─────────────────────────────────────────────────────────
  // 10. Osig — Obrazec 1
  // ─────────────────────────────────────────────────────────
  {
    id: 'osig-obrazec1',
    category: 'osig',
    question: {
      ru: 'Подан ли Образец 1 вовремя?',
      en: 'Has the Obrazec 1 return been filed on time?',
      bg: 'Подадена ли е декларация Образец 1 навреме?',
      uk: 'Чи подано декларацію Зразок 1 вчасно?',
    },
    hint: {
      ru: 'Подтверждение подачи Образец 1 за текущий период.',
      en: 'Confirms timely filing of Obrazec 1 for the current period.',
      bg: 'Потвърждение за своевременно подаване на Образец 1.',
      uk: 'Підтвердження своєчасної подачі Зразка 1.',
    },
    template_bg:
`ОБЯСНИТЕЛНА ЗАПИСКА — {{today}}

Относно: Декларация Образец 1 на {{companyName}}, ЕИК {{eik}}

Декларация Образец 1 за служителите на дружеството {{companyName}} за период {{period}} е подадена в НАП в срока по чл. 7 от КСО — до 25-то число на текущия месец за осигурителните вноски за предходния месец.

Общо осигурителни вноски работодател: {{totalEr}} €
Общо осигурителни вноски работник: {{totalEe}} €

Приложение: копие на подадена декларация Образец 1.

С уважение,
{{ownerName}}
Управител на {{companyName}}`,
    template_ru:
`ОБЪЯСНИТЕЛНАЯ ЗАПИСКА — {{today}}

Тема: Декларация Образец 1 компании {{companyName}}, ЕИК {{eik}}

Декларация Образец 1 по работникам компании {{companyName}} за период {{period}} подана в НАП в срок по ст. 7 КСО — до 25-го числа текущего месяца по взносам за предыдущий месяц.

Всего взносы работодателя: {{totalEr}} €
Всего взносы работника: {{totalEe}} €

Приложение: копия поданной декларации Образец 1.

С уважением,
{{ownerName}}
Управляющий {{companyName}}`,
    template_en:
`EXPLANATORY NOTE — {{today}}

Subject: Obrazec 1 return of {{companyName}}, UIC {{eik}}

The Obrazec 1 return covering the employees of {{companyName}} for the period {{period}} has been filed with the NRA within the deadline set by Art. 7 KSO — by the 25th of the current month, for the contributions of the preceding month.

Total employer contributions: {{totalEr}} €
Total employee contributions: {{totalEe}} €

Enclosure: copy of the filed Obrazec 1 return.

Yours faithfully,
{{ownerName}}
Manager of {{companyName}}`,
    template_uk:
`ПОЯСНЮВАЛЬНА ЗАПИСКА — {{today}}

Тема: Декларація Зразок 1 компанії {{companyName}}, ЄІК {{eik}}

Декларацію Зразок 1 щодо працівників компанії {{companyName}} за період {{period}} подано до НАП у строк за ст. 7 КСО — до 25-го числа поточного місяця за внесками за попередній місяць.

Загальні внески роботодавця: {{totalEr}} €
Загальні внески працівника: {{totalEe}} €

Додаток: копія поданої декларації Зразок 1.

З повагою,
{{ownerName}}
Керуючий {{companyName}}`,
    required_data: ['companyName', 'eik', 'period', 'totalEr', 'totalEe', 'ownerName', 'today'],
    applicable: { legalForms: ['ood', 'et'], hasEmployees: true },
  },
]
