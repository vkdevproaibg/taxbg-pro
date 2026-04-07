export type LegalForm = 'ood' | 'et' | 'self'
export type Authority = 'НАП' | 'НОИ' | 'БРРА' | 'НАП/НОИ' | 'НСИ'

export interface Deadline {
  id: string
  month: number
  day: number
  title_ru: string
  description_ru: string
  formNumber: string | null
  authority: Authority
  forms: LegalForm[]
  isMonthly: boolean
  penaltyInfo_ru: string
}

export const DEADLINES_2025: Deadline[] = [
  // Monthly
  { id: 'dds-monthly', month: 0, day: 14, title_ru: 'Декларация ДДС за предходния месец', description_ru: 'Дневник покупки и продажби, справка-декларация', formNumber: null, authority: 'НАП', forms: ['ood','et'], isMonthly: true, penaltyInfo_ru: 'Глоба до 5 000 € при закъснение' },
  { id: 'osig-monthly', month: 0, day: 25, title_ru: 'Осигуровки за служители за предходния месец', description_ru: 'ДОО + УПФ + ЗО + ОЗМ + ТЗПБ', formNumber: 'Обр. 1', authority: 'НАП', forms: ['ood','et'], isMonthly: true, penaltyInfo_ru: 'Лихва 0.03% на ден' },
  { id: 'self-osig-monthly', month: 0, day: 25, title_ru: 'Осигуровки самоосигуряващ за предходния месец', description_ru: 'ДОО + УПФ + ЗО (+ ОЗМ по избор)', formNumber: null, authority: 'НАП', forms: ['self','et'], isMonthly: true, penaltyInfo_ru: 'Лихва 0.03% на ден' },
  // Annual
  { id: 'spravka1-feb', month: 2, day: 28, title_ru: 'Справка 1 — доходи на служители за годината', description_ru: 'Годишна информационна справка', formNumber: 'Справка 1', authority: 'НАП', forms: ['ood','et'], isMonthly: false, penaltyInfo_ru: 'Глоба 250–500 €' },
  { id: 'gdd-et-mar', month: 3, day: 31, title_ru: 'Годишна данъчна декларация ЗДДФЛ', description_ru: 'Приложение 2 (ЕТ) или Приложение 7 (самоосиг.)', formNumber: 'ГДД ЗДДФЛ', authority: 'НАП', forms: ['et','self'], isMonthly: false, penaltyInfo_ru: 'Глоба 500–3 000 €' },
  { id: 'gfo-ood-mar', month: 3, day: 31, title_ru: 'Годишен финансов отчёт (баланс + ОПР)', description_ru: 'Счетоводен отчёт за изминалата година', formNumber: 'ГФО', authority: 'БРРА', forms: ['ood'], isMonthly: false, penaltyInfo_ru: 'Глоба 500–2 000 €' },
  { id: 'zkpo-apr', month: 4, day: 30, title_ru: 'Годишна декларация ЗКПО — корпоративен данък', description_ru: 'Данъчна декларация по ЗКПО', formNumber: 'ГДД ЗКПО', authority: 'НАП', forms: ['ood'], isMonthly: false, penaltyInfo_ru: 'Глоба 500–3 000 € + лихва' },
  { id: 'gfo-pub-apr', month: 4, day: 30, title_ru: 'Публикуване на ГФО в Агенция по вписванията', description_ru: 'Обявяване на годишния финансов отчёт', formNumber: null, authority: 'БРРА', forms: ['ood'], isMonthly: false, penaltyInfo_ru: 'Глоба 500–2 000 €' },
  { id: 'avans1-jun', month: 6, day: 15, title_ru: '1-ва авансова вноска ЗКПО', description_ru: 'Авансов корпоративен данък', formNumber: null, authority: 'НАП', forms: ['ood'], isMonthly: false, penaltyInfo_ru: 'Лихва при закъснение' },
  { id: 'avans2-sep', month: 9, day: 15, title_ru: '2-ра авансова вноска ЗКПО', description_ru: 'Авансов корпоративен данък', formNumber: null, authority: 'НАП', forms: ['ood'], isMonthly: false, penaltyInfo_ru: 'Лихва при закъснение' },
  { id: 'avans3-dec', month: 12, day: 15, title_ru: '3-та авансова вноска ЗКПО', description_ru: 'Авансов корпоративен данък', formNumber: null, authority: 'НАП', forms: ['ood'], isMonthly: false, penaltyInfo_ru: 'Лихва при закъснение' },
]

export const DEADLINES_2026: Deadline[] = [
  // Monthly
  { id: 'dds-monthly-2026', month: 0, day: 14, title_ru: 'Декларация ДДС за предходния месец', description_ru: 'Дневник покупки и продажби, справка-декларация', formNumber: null, authority: 'НАП', forms: ['ood', 'et'], isMonthly: true, penaltyInfo_ru: 'Глоба до 5 000 € при закъснение' },
  { id: 'osig-monthly-2026', month: 0, day: 25, title_ru: 'Осигуровки за служители за предходния месец', description_ru: 'ДОО + УПФ + ЗО + ОЗМ + ТЗПБ', formNumber: 'Обр. 1', authority: 'НАП', forms: ['ood', 'et'], isMonthly: true, penaltyInfo_ru: 'Лихва 0.03% на ден' },
  { id: 'self-osig-monthly-2026', month: 0, day: 25, title_ru: 'Осигуровки самоосигуряващ за предходния месец', description_ru: 'ДОО + УПФ + ЗО (+ ОЗМ по выбору)', formNumber: null, authority: 'НАП', forms: ['self', 'et'], isMonthly: true, penaltyInfo_ru: 'Лихва 0.03% на ден' },
  // Annual
  { id: 'kep-check', month: 1, day: 15, title_ru: 'Проверка срока КЕП (электронной подписи)', description_ru: 'КЕП нужен для подачи отчётов в НАП, НСИ и БРРА. Обновите заранее в B-Trust или Evrotrust', formNumber: null, authority: 'НАП', forms: ['ood', 'et', 'self'], isMonthly: false, penaltyInfo_ru: 'Без КЕП невозможна электронная подача' },
  { id: 'spravka1-feb-2026', month: 2, day: 28, title_ru: 'Справка 1 — доходи на служители за годината', description_ru: 'Годишна информационна справка', formNumber: 'Справка 1', authority: 'НАП', forms: ['ood', 'et'], isMonthly: false, penaltyInfo_ru: 'Глоба 250–500 €' },
  { id: 'gdd-et-mar-2026', month: 3, day: 31, title_ru: 'Годишна данъчна декларация ЗДДФЛ', description_ru: 'Приложение 2 (ЕТ) или Приложение 7 (самоосиг.)', formNumber: 'ГДД ЗДДФЛ', authority: 'НАП', forms: ['et', 'self'], isMonthly: false, penaltyInfo_ru: 'Глоба 500–3 000 €' },
  { id: 'nsi-annual-2026', month: 3, day: 31, title_ru: 'Годишен отчёт в НСИ', description_ru: 'Статистически отчёт за дейността. Подава се онлайн на nsi.bg с КЕП', formNumber: 'Форма 1-предприятие', authority: 'НСИ', forms: ['ood', 'et'], isMonthly: false, penaltyInfo_ru: 'Глоба 500–2 000 € (ЗСТАТИСТИКАТА чл. 52)' },
  { id: 'gfo-ood-mar-2026', month: 3, day: 31, title_ru: 'Годишен финансов отчёт (баланс + ОПР)', description_ru: 'Счетоводен отчёт за изминалата година', formNumber: 'ГФО', authority: 'БРРА', forms: ['ood'], isMonthly: false, penaltyInfo_ru: 'Глоба 500–2 000 €' },
  { id: 'zkpo-apr-2026', month: 4, day: 30, title_ru: 'Годишна декларация ЗКПО — корпоративен данък', description_ru: 'Данъчна декларация по ЗКПО', formNumber: 'ГДД ЗКПО', authority: 'НАП', forms: ['ood'], isMonthly: false, penaltyInfo_ru: 'Глоба 500–3 000 € + лихва' },
  { id: 'gfo-pub-apr-2026', month: 4, day: 30, title_ru: 'Публикуване на ГФО в Агенция по вписванията', description_ru: 'Обявяване на годишния финансов отчёт', formNumber: null, authority: 'БРРА', forms: ['ood'], isMonthly: false, penaltyInfo_ru: 'Глоба 500–2 000 €' },
  { id: 'avans1-jun-2026', month: 6, day: 15, title_ru: '1-ва авансова вноска ЗКПО', description_ru: 'Авансов корпоративен данък', formNumber: null, authority: 'НАП', forms: ['ood'], isMonthly: false, penaltyInfo_ru: 'Лихва при закъснение' },
  { id: 'avans2-sep-2026', month: 9, day: 15, title_ru: '2-ра авансова вноска ЗКПО', description_ru: 'Авансов корпоративен данък', formNumber: null, authority: 'НАП', forms: ['ood'], isMonthly: false, penaltyInfo_ru: 'Лихва при закъснение' },
  { id: 'avans3-dec-2026', month: 12, day: 15, title_ru: '3-та авансова вноска ЗКПО', description_ru: 'Авансов корпоративен данък', formNumber: null, authority: 'НАП', forms: ['ood'], isMonthly: false, penaltyInfo_ru: 'Лихва при закъснение' },
]
