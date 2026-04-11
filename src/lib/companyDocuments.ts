// CURRENCY RULE C — EU-origin threshold (VAT, accounting etc.)
// Do NOT convert old BGN figure. Use the direct EUR threshold
// from the EU Directive as implemented in Bulgarian law.
// Format: "~2 000 000 € (праг малко предприятие по ЗСч чл. 18, Директива 2013/34/ЕС)"

import JSZip from 'jszip'
import { saveAs } from 'file-saver'

export interface CompanyFormData {
  // Company
  companyName: string
  companySuffix: string      // "ЕООД" | "ООД"
  eik: string
  registeredAddress: string
  capital: string
  mainActivity: string
  // Director / Founder (same person for ЕООД)
  directorLastName: string
  directorFirstName: string
  directorMiddleName: string
  directorCitizenship: string
  directorBirthDate: string
  directorBirthPlace: string
  directorPassportNumber: string
  directorPassportIssueDate: string
  directorPassportExpiry: string
  directorPassportIssuedBy: string
  directorAddress: string
  // For ООД — second founder (optional)
  founder2Name: string
  founder2Share: string
  // Meta
  cityOfSigning: string
  dateOfSigning: string
}

export const EMPTY_COMPANY_FORM: CompanyFormData = {
  companyName: '',
  companySuffix: 'ЕООД',
  eik: '',
  registeredAddress: '',
  capital: '102',
  mainActivity: `Покупка на стоки и други вещи с цел продажба в първоначален, преработен или преопакован вид; извършване на търговска дейност в страната и в чужбина, внос, износ и реекспорт на стоки; търговско посредничество и представителство; разработка на софтуер и информационни технологии; консултантски и маркетингови услуги; отдаване под наем на движими и недвижими вещи; рекламна дейност; образователни услуги; всякакви производствени и търговски дейности, незабранени от закона. Дейностите, за които се изисква разрешителен, лицензионен или регистрационен режим, се извършват само след получаване на съответното разрешение или лиценз.`,
  directorLastName: '',
  directorFirstName: '',
  directorMiddleName: '',
  directorCitizenship: '',
  directorBirthDate: '',
  directorBirthPlace: '',
  directorPassportNumber: '',
  directorPassportIssueDate: '',
  directorPassportExpiry: '',
  directorPassportIssuedBy: '',
  directorAddress: '',
  founder2Name: '',
  founder2Share: '',
  cityOfSigning: 'София',
  dateOfSigning: new Date().toISOString().split('T')[0],
}

// ── Helpers ────────────────────────────────────────────────

function fmt(d: string) {
  // YYYY-MM-DD -> DD.MM.YYYY
  if (!d) return '________'
  const parts = d.split('-')
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`
  return d
}

function fullName(f: CompanyFormData) {
  return [f.directorLastName, f.directorFirstName, f.directorMiddleName]
    .filter(Boolean).join(' ')
}

function fullCompanyName(f: CompanyFormData) {
  return `${f.companyName} ${f.companySuffix}`
}

// ── DOCUMENT GENERATORS ───────────────────────────────────

function doc_uchreditelen_akt(f: CompanyFormData): string {
  const name = fullCompanyName(f)
  const director = fullName(f)
  const founder1Share = f.companySuffix === 'ООД' && f.founder2Share
    ? String(100 - parseInt(f.founder2Share))
    : '100'

  return `УЧРЕДИТЕЛЕН АКТ
на Еднолично дружество с ограничена отговорност
„${name}"

Днес, ${fmt(f.dateOfSigning)} г., в гр. ${f.cityOfSigning || '________'},

Аз, ${director},
гражданин на ${f.directorCitizenship || '________'},
роден на ${fmt(f.directorBirthDate)} г. в ${f.directorBirthPlace || '________'},
притежаващ паспорт №${f.directorPassportNumber || '________'},
издаден на ${fmt(f.directorPassportIssueDate)} г. от ${f.directorPassportIssuedBy || '________'},
валиден до ${fmt(f.directorPassportExpiry)} г.,
с постоянен адрес: ${f.directorAddress || '________'},

като единствен собственик на капитала, приемам настоящия

УЧРЕДИТЕЛЕН АКТ

Раздел I. ОБЩИ РАЗПОРЕДБИ

Чл. 1. Учредява се Еднолично дружество с ограничена отговорност с наименование:
„${name}".

Чл. 2. Седалището и адресът на управление на Дружеството е:
${f.registeredAddress || '________'}.

Чл. 3. Дружеството е учредено за неопределен срок.

Чл. 4. Дружеството е юридическо лице и осъществява дейността си при условията и реда, предвидени в Търговски закон на Република България.

Раздел II. ПРЕДМЕТ НА ДЕЙНОСТ

Чл. 5. Предметът на дейност на Дружеството е:
${f.mainActivity || '________'}, както и всяка друга дейност, незабранена от закона.

Раздел III. КАПИТАЛ И ДЯЛОВЕ

Чл. 6. Капиталът на Дружеството е ${f.capital || '________'} евро (EUR), разпределен в ${f.capital || '________'} дяла, всеки от по 1 (едно) евро.

Забележка: Считано от 01.01.2026 г. официалната валута на Република България е еврото. Капиталът се вписва в евро. Минималният капитал на ЕООД/ООД е 1 евро.

Чл. 7. Целият капитал е собственост на ${director}, с дял от ${founder1Share}% от капитала.

Чл. 8. Прехвърлянето на дялове се извършва с договор в писмена форма с нотариална заверка на подписите.

Раздел IV. УПРАВЛЕНИЕ

Чл. 9. Едноличният собственик на капитала взема решенията, предоставени от закона на Общото събрание.

Чл. 10. Дружеството се управлява и представлява от Управител.

Чл. 11. За Управител на Дружеството се назначава: ${director}.

Чл. 12. Управителят организира и ръководи дейността на Дружеството в съответствие с решенията на едноличния собственик на капитала и разпоредбите на закона.

Чл. 13. Управителят представлява Дружеството пред трети лица и пред съдилищата. Управителят може да упълномощава трети лица за извършване на определени действия.

Раздел V. РАЗПРЕДЕЛЕНИЕ НА ПЕЧАЛБАТА

Чл. 14. Решението за разпределяне на печалбата се взема от едноличния собственик на капитала.

Раздел VI. ПРЕКРАТЯВАНЕ И ЛИКВИДАЦИЯ

Чл. 15. Дружеството се прекратява на основанията, предвидени от Търговски закон.

Чл. 16. При прекратяване на Дружеството се извършва ликвидация по реда на Търговски закон.

Раздел VII. ЗАКЛЮЧИТЕЛНИ РАЗПОРЕДБИ

Чл. 17. За неуредените в настоящия Учредителен акт въпроси се прилагат разпоредбите на Търговски закон на Република България.

Чл. 18. Настоящият Учредителен акт е съставен и подписан в два еднообразни екземпляра.

${f.cityOfSigning || '________'}, ${fmt(f.dateOfSigning)} г.

Единствен собственик на капитала:

_________________________
${director}
`
}

function doc_reshenie_uchredyavane(f: CompanyFormData): string {
  const name = fullCompanyName(f)
  const director = fullName(f)
  return `РЕШЕНИЕ
на едноличния собственик на капитала на „${name}"

Днес, ${fmt(f.dateOfSigning)} г., в гр. ${f.cityOfSigning || '________'},

Аз, ${director},
като единствен собственик на капитала,
РЕШИХ:

1. Да учредя Еднолично дружество с ограничена отговорност
   с наименование „${name}".

2. Седалище и адрес на управление:
   ${f.registeredAddress || '________'}.

3. Предмет на дейност:
   ${f.mainActivity || '________'}, и всяка друга дейност, незабранена от закона.

4. Капиталът на Дружеството е ${f.capital || '________'} евро (EUR),
   разпределен в ${f.capital || '________'} дяла по 1 евро всеки.
   Капиталът е изцяло внесен от ${director}.

5. За Управител на Дружеството се назначава ${director},
   който да управлява и представлява Дружеството
   самостоятелно без ограничения.

6. Приема се Учредителният акт на Дружеството.

${f.cityOfSigning || '________'}, ${fmt(f.dateOfSigning)} г.

Единствен собственик на капитала:

_________________________
${director}
`
}

function doc_deklaracia_syglacie(f: CompanyFormData): string {
  const name = fullCompanyName(f)
  const director = fullName(f)
  return `ДЕКЛАРАЦИЯ
по чл. 141, ал. 8 от Търговски закон

Долуподписаният / Долуподписаната:

${director},
гражданин на ${f.directorCitizenship || '________'},
роден(а) на ${fmt(f.directorBirthDate)} г. в ${f.directorBirthPlace || '________'},
паспорт №${f.directorPassportNumber || '________'},
издаден от ${f.directorPassportIssuedBy || '________'} на ${fmt(f.directorPassportIssueDate)} г.,
постоянен адрес: ${f.directorAddress || '________'},

ДЕКЛАРИРАМ:

Съгласен(на) съм да бъда вписан(а) като Управител на
„${name}" с ЕИК ${f.eik || '__________(след вписване)__________'}.

Известна ми е отговорността по чл. 142 от Търговски закон —
без съгласие на Дружеството нямам право от свое или от чуждо
име да извършвам търговски сделки, да участвам в събирателни,
командитни дружества и дружества с ограничена отговорност,
нито да заемам ръководни длъжности в такива дружества,
когато са регистрирани за дейност, аналогична на дейността
на управляваното от мен дружество.

Отговорен(на) съм за точността на представените данни.

ОБРАЗЕЦ НА ПОДПИС:

_________________________
(собственоръчен подпис)

${director}

${f.cityOfSigning || '________'}, ${fmt(f.dateOfSigning)} г.

Забележка: Подписът трябва да бъде нотариално заверен.
`
}

function doc_dogovor_upravlenie(f: CompanyFormData): string {
  const name = fullCompanyName(f)
  const director = fullName(f)
  return `ДОГОВОР ЗА УПРАВЛЕНИЕ

Сключен на ${fmt(f.dateOfSigning)} г. в гр. ${f.cityOfSigning || '________'}

МЕЖДУ:

„${name}", ЕИК: ${f.eik || '________'},
със седалище и адрес на управление: ${f.registeredAddress || '________'},
представлявано от едноличния собственик на капитала ${director},
наричано по-долу „ДРУЖЕСТВОТО",

И

${director},
гражданин на ${f.directorCitizenship || '________'},
роден(а) на ${fmt(f.directorBirthDate)} г. в ${f.directorBirthPlace || '________'},
паспорт №${f.directorPassportNumber || '________'},
с постоянен адрес: ${f.directorAddress || '________'},
наричан(а) по-долу „УПРАВИТЕЛЯТ",

СЕ СКЛЮЧИ НАСТОЯЩИЯТ ДОГОВОР:

Чл. 1. ПРЕДМЕТ
Дружеството възлага, а Управителят приема да управлява и
представлява „${name}" при условията на настоящия договор.

Чл. 2. ПРАВА И ЗАДЪЛЖЕНИЯ НА УПРАВИТЕЛЯ
(1) Управителят организира и ръководи цялостната дейност
    на Дружеството.
(2) Управителят представлява Дружеството пред трети лица,
    пред съдилища и пред държавни органи.
(3) Управителят подписва всички документи от името на
    Дружеството.
(4) Управителят може да упълномощава трети лица за
    конкретни действия.

Чл. 3. ОТЧЕТНОСТ
Управителят е длъжен да осигури редовното водене на
счетоводната и административна документация на Дружеството.

Чл. 4. СРОК
Договорът се сключва за неопределен срок, считано от
датата на вписване на Управителя в Търговски регистър.

Чл. 5. ПРЕКРАТЯВАНЕ
Договорът може да бъде прекратен:
- по взаимно съгласие на страните;
- от едноличния собственик на капитала по всяко време;
- при смърт или поставяне под запрещение на Управителя.

Чл. 6. ПРИЛОЖИМО ПРАВО
За неуредените въпроси се прилагат разпоредбите на
Търговски закон и Закона за задълженията и договорите.

Настоящият договор е съставен в два еднообразни екземпляра —
по един за всяка от страните.

ДРУЖЕСТВОТО:                    УПРАВИТЕЛЯТ:

_________________________       _________________________
${director}                     ${director}
(Едноличен собственик)          (Управител)
`
}

function doc_deklaracia_142(f: CompanyFormData): string {
  const name = fullCompanyName(f)
  const director = fullName(f)
  return `ДЕКЛАРАЦИЯ
по чл. 142 от Търговски закон

Долуподписаният / Долуподписаната:
${director},
управител на „${name}",

ДЕКЛАРИРАМ, ЧЕ:

1. Не съм осъждан(а) за умишлено престъпление от
   общ характер с влязла в сила присъда, независимо
   от реабилитацията.

2. Не съм лишен(а) от правото да заема
   материалноотговорна длъжност.

3. Не участвам като неограничено отговорен съдружник
   в събирателно или командитно дружество.

4. Не управлявам дружества с ограничена отговорност,
   регистрирани за идентична дейност, без съгласие на
   настоящото Дружество.

5. Декларираната информация е вярна и пълна.
   Известна ми е наказателната отговорност за деклариране
   на неверни данни.

${f.cityOfSigning || '________'}, ${fmt(f.dateOfSigning)} г.

_________________________
${director}
`
}

function doc_deklaracia_vernost(f: CompanyFormData): string {
  const name = fullCompanyName(f)
  const director = fullName(f)
  return `ДЕКЛАРАЦИЯ
за истинността на заявените обстоятелства
и приемането им от лицето, което ги заявява

(по чл. 13 от Закона за търговски регистър)

Долуподписаният / Долуподписаната:
${director},
в качеството ми на заявител на вписване на „${name}"
в Търговски регистър,

ДЕКЛАРИРАМ:

1. Заявените обстоятелства са истински.
2. Представените документи са верни.
3. Запознат(а) съм с последиците от заявяване на
   неверни обстоятелства съгласно чл. 313 НК.

${f.cityOfSigning || '________'}, ${fmt(f.dateOfSigning)} г.

_________________________
${director}
`
}

function doc_zapoved_schetovodel(f: CompanyFormData): string {
  const name = fullCompanyName(f)
  const director = fullName(f)
  return `ЗАПОВЕД №001-СЧ/${fmt(f.dateOfSigning).split('.').reverse().join('')}

Дружество: „${name}"
ЕИК: ${f.eik || '________'}
Адрес: ${f.registeredAddress || '________'}

С настоящата ЗАПОВЕД, Аз — ${director},
в качеството ми на Управител на „${name}",

НАРЕЖДАМ:

1. Считано от ${fmt(f.dateOfSigning)} г., функциите по
   организиране и водене на счетоводната документация
   и отчетност на Дружеството се изпълняват лично от мен
   — Управителя ${director}.

2. Обработката на счетоводните документи се осъществява
   съгласно изискванията на Закона за счетоводството
   и Националните счетоводни стандарти.

3. Настоящата заповед влиза в сила от датата на издаването й.

Правно основание: чл. 18, ал. 1 от Закона за счетоводството.

Забележка: Малките предприятия (нетни приходи от продажби
до ~2 000 000 € — праг малко предприятие по ЗСч чл. 18, Директива 2013/34/ЕС) могат да не изготвят годишен доклад за
дейността, а управителят може да отговаря за счетоводната
отчетност без назначаване на отделен счетоводител.

${f.cityOfSigning || '________'}, ${fmt(f.dateOfSigning)} г.

Управител: _________________________
           ${director}
`
}

function doc_obrazec_podpis_banka(f: CompanyFormData): string {
  const name = fullCompanyName(f)
  const director = fullName(f)
  return `ОБРАЗЕЦ НА ПОДПИС
за нуждите на банковото обслужване

Дружество: „${name}"
ЕИК: ${f.eik || '________'}
Адрес: ${f.registeredAddress || '________'}

Лице с право на подпис:

Трите имена: ${director}
Длъжност: Управител
Гражданство: ${f.directorCitizenship || '________'}
Паспорт №: ${f.directorPassportNumber || '________'}
Издаден: ${fmt(f.directorPassportIssueDate)} г.
Валиден до: ${fmt(f.directorPassportExpiry)} г.

ОБРАЗЕЦ НА ПОДПИС:


_________________________
(собственоръчен подпис на управителя)

${director}


Настоящият образец е заверен от нотариус.

${f.cityOfSigning || '________'}, ${fmt(f.dateOfSigning)} г.

Забележка: Документът се подписва лично пред нотариус.
`
}

function doc_ubo(f: CompanyFormData): string {
  const name = fullCompanyName(f)
  const director = fullName(f)
  return `ДЕКЛАРАЦИЯ
за действителен собственик
(по чл. 63 от ЗМИП)

Декларатор: „${name}", ЕИК: ${f.eik || '________'}
Представлявано от Управителя: ${director}

ДЕКЛАРИРАМ:

Действителен собственик (Ultimate Beneficial Owner — UBO)
на „${name}" по смисъла на чл. 3, т. 6 от ЗМИП е:

Трите имена: ${director}
Гражданство: ${f.directorCitizenship || '________'}
Дата на раждане: ${fmt(f.directorBirthDate)}
Паспорт №: ${f.directorPassportNumber || '________'}
Постоянен адрес: ${f.directorAddress || '________'}
Дял в капитала: 100%

Информацията е вярна и пълна. Задължавам се да уведомя
незабавно при промяна в посочените обстоятелства.

Известна ми е отговорността по ЗМИП за деклариране
на неверни данни.

${f.cityOfSigning || '________'}, ${fmt(f.dateOfSigning)} г.

Управител: _________________________
           ${director}
`
}

function doc_prohod_sredstva(f: CompanyFormData): string {
  const name = fullCompanyName(f)
  const director = fullName(f)
  return `ДЕКЛАРАЦИЯ
за произхода на средствата
(за нуждите на KYC/AML проверката при банково обслужване)

Декларатор: ${director},
Управител на „${name}",
ЕИК: ${f.eik || '________'}

ДЕКЛАРИРАМ:

1. Уставният капитал в размер на ${f.capital || '________'} евро (EUR)
   произхожда от законна стопанска/трудова дейност
   на едноличния собственик.

2. Планираните операции по банковата сметка са свързани с:
   ${f.mainActivity || '________'}.

3. Очакван месечен оборот: _____________________ евро (EUR).

4. Контрагентите са предимно:
   □ Местни юридически лица
   □ Чуждестранни юридически лица (ЕС)
   □ Физически лица
   □ Друго: _____________________

5. Средствата не произхождат от незаконна дейност.
   Известна ми е отговорността по ЗМИП.

${f.cityOfSigning || '________'}, ${fmt(f.dateOfSigning)} г.

Управител: _________________________
           ${director}
`
}

// ── PACKAGE ALL DOCUMENTS ─────────────────────────────────

export interface GeneratedDoc {
  filename: string
  content: string
  description: string
  requiredFor: string[]
}

export function generateAllDocs(f: CompanyFormData): GeneratedDoc[] {
  return [
    {
      filename: '01_Uchreditelen_Akt.txt',
      content: doc_uchreditelen_akt(f),
      description: 'Учредителен акт на ЕООД',
      requiredFor: ['БРРА', 'Банка', 'НАП'],
    },
    {
      filename: '02_Reshenie_Uchredyavane.txt',
      content: doc_reshenie_uchredyavane(f),
      description: 'Решение за учредяване на ЕООД',
      requiredFor: ['БРРА'],
    },
    {
      filename: '03_Deklaracia_Syglacie_Upravitel.txt',
      content: doc_deklaracia_syglacie(f),
      description: 'Декларация за съгласие на управителя + образец на подпис',
      requiredFor: ['БРРА'],
    },
    {
      filename: '04_Dogovor_Upravlenie.txt',
      content: doc_dogovor_upravlenie(f),
      description: 'Договор за управление между дружеството и управителя',
      requiredFor: ['БРРА', 'НАП', 'Банка'],
    },
    {
      filename: '05_Deklaracia_142_TZ.txt',
      content: doc_deklaracia_142(f),
      description: 'Декларация по чл. 142 ТЗ (липса на пречки за управление)',
      requiredFor: ['БРРА'],
    },
    {
      filename: '06_Deklaracia_Vernost_Danni.txt',
      content: doc_deklaracia_vernost(f),
      description: 'Декларация за верността на данните (чл. 13 ЗТР)',
      requiredFor: ['БРРА'],
    },
    {
      filename: '07_Zapoved_Schetovoditel.txt',
      content: doc_zapoved_schetovodel(f),
      description: 'Заповед — управителят изпълнява функции на счетоводител',
      requiredFor: ['НАП', 'Вътрешен'],
    },
    {
      filename: '08_Obrazec_Podpis_Banka.txt',
      content: doc_obrazec_podpis_banka(f),
      description: 'Образец на подпис за банката (нотариална заверка)',
      requiredFor: ['Банка'],
    },
    {
      filename: '09_Deklaracia_UBO.txt',
      content: doc_ubo(f),
      description: 'Декларация за действителен собственик (UBO по ЗМИП)',
      requiredFor: ['Банка', 'БРРА'],
    },
    {
      filename: '10_Deklaracia_Prohod_Sredstva.txt',
      content: doc_prohod_sredstva(f),
      description: 'Декларация за произхода на средствата (KYC/AML)',
      requiredFor: ['Банка'],
    },
  ]
}

export async function downloadDocumentPackage(
  f: CompanyFormData
): Promise<void> {
  const docs = generateAllDocs(f)
  const zip = new JSZip()
  const name = fullCompanyName(f)

  const index = [
    `ПАКЕТ УЧРЕДИТЕЛНИ ДОКУМЕНТИ`,
    `Дружество: „${name}"`,
    `Дата: ${fmt(f.dateOfSigning)}`,
    ``,
    `СЪДЪРЖАНИЕ:`,
    ...docs.map((d, i) =>
      `${String(i + 1).padStart(2, '0')}. ${d.description}\n    Необходим за: ${d.requiredFor.join(', ')}`
    ),
    ``,
    `ВАЖНО: Документите са подготвени като проект (draft).`,
    `Преди подаване в БРРА/банка трябва да бъдат:`,
    `- Проверени от юрист/нотариус`,
    `- Преведени на български (ако е необходимо)`,
    `- Подписани лично`,
    `- Нотариално заверени (декларации, образец на подпис)`,
    ``,
    `Генерирано от TaxBG Pro — taxbg.pro`,
  ].join('\n')

  zip.file('00_INDEX.txt', index)
  docs.forEach(d => zip.file(d.filename, d.content))

  const blob = await zip.generateAsync({ type: 'blob' })
  const safeName = f.companyName
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toUpperCase()
  saveAs(blob, `Dokumenti_${safeName}_${f.dateOfSigning}.zip`)
}
