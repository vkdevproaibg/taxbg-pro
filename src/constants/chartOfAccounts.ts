export interface Account {
  code: string
  name_bg: string
  name_ru: string
  class: number
  type: 'active' | 'passive' | 'active-passive'
  normalBalance: 'debit' | 'credit'
  description_ru: string
  examples_ru: string[]
}

export const CHART_OF_ACCOUNTS: Account[] = [
  // KLAS 2 - DULGOTRAYNI AKTIVI
  {
    code: '205',
    name_bg: 'Компютри и оборудване',
    name_ru: 'Компьютеры и оборудование',
    class: 2,
    type: 'active',
    normalBalance: 'debit',
    description_ru: 'Основные средства - компьютеры, серверы, телефоны, оргтехника',
    examples_ru: ['Покупка MacBook Pro', 'Покупка сервера', 'Покупка телефона'],
  },
  {
    code: '206',
    name_bg: 'Транспортни средства',
    name_ru: 'Транспортные средства',
    class: 2,
    type: 'active',
    normalBalance: 'debit',
    description_ru: 'Автомобили и другие транспортные средства на балансе ООД',
    examples_ru: ['Покупка автомобиля на ООД'],
  },
  {
    code: '207',
    name_bg: 'Стопански инвентар',
    name_ru: 'Хозяйственный инвентарь',
    class: 2,
    type: 'active',
    normalBalance: 'debit',
    description_ru: 'Офисная мебель, оборудование офиса',
    examples_ru: ['Покупка стола', 'Покупка кресла'],
  },
  {
    code: '241',
    name_bg: 'Амортизация на компютри',
    name_ru: 'Амортизация компьютеров',
    class: 2,
    type: 'passive',
    normalBalance: 'credit',
    description_ru: 'Начисленная амортизация компьютеров и оборудования (50%/год)',
    examples_ru: ['Ежегодная амортизация MacBook'],
  },
  {
    code: '246',
    name_bg: 'Амортизация на транспортни средства',
    name_ru: 'Амортизация автомобилей',
    class: 2,
    type: 'passive',
    normalBalance: 'credit',
    description_ru: 'Начисленная амортизация транспортных средств (25%/год)',
    examples_ru: ['Ежегодная амортизация автомобиля'],
  },

  // KLAS 4 - RAZCHETI
  {
    code: '401',
    name_bg: 'Доставчици',
    name_ru: 'Поставщики',
    class: 4,
    type: 'passive',
    normalBalance: 'credit',
    description_ru: 'Задолженность перед поставщиками за полученные услуги/товары',
    examples_ru: ['Получена услуга хостинга, оплата позже', 'Счёт от подрядчика'],
  },
  {
    code: '411',
    name_bg: 'Клиенти',
    name_ru: 'Клиенты',
    class: 4,
    type: 'active',
    normalBalance: 'debit',
    description_ru: 'Дебиторская задолженность - клиент должен нам',
    examples_ru: ['Выставлена фактура клиенту, оплата не получена'],
  },
  {
    code: '421',
    name_bg: 'Персонал',
    name_ru: 'Персонал (зарплата к выплате)',
    class: 4,
    type: 'passive',
    normalBalance: 'credit',
    description_ru: 'Начисленная но не выплаченная зарплата',
    examples_ru: ['Начислена зарплата за месяц'],
  },
  {
    code: '422',
    name_bg: 'Подотчетни лица',
    name_ru: 'Подотчётные лица',
    class: 4,
    type: 'active-passive',
    normalBalance: 'debit',
    description_ru: 'Авансы выданные сотрудникам под отчёт',
    examples_ru: ['Аванс на командировку'],
  },
  {
    code: '451',
    name_bg: 'ДДС за внасяне',
    name_ru: 'НДС к уплате в НАП',
    class: 4,
    type: 'passive',
    normalBalance: 'credit',
    description_ru: 'НДС начисленный с продаж - к уплате в НАП до 14-го',
    examples_ru: ['НДС с фактуры клиенту'],
  },
  {
    code: '452',
    name_bg: 'ДДС за възстановяване',
    name_ru: 'НДС к возврату из НАП',
    class: 4,
    type: 'active',
    normalBalance: 'debit',
    description_ru: 'Входящий НДС (данъчен кредит) по покупкам',
    examples_ru: ['НДС в счёте от поставщика с болгарским ДДС'],
  },
  {
    code: '453',
    name_bg: 'Разчети с бюджета',
    name_ru: 'Расчёты с бюджетом (налоги)',
    class: 4,
    type: 'active-passive',
    normalBalance: 'credit',
    description_ru: 'КНП, ДДФЛ и другие налоги к уплате',
    examples_ru: ['Начислен корпоративный налог'],
  },
  {
    code: '461',
    name_bg: 'Разчети с осигурители',
    name_ru: 'Расчёты по социальному страхованию',
    class: 4,
    type: 'passive',
    normalBalance: 'credit',
    description_ru: 'Осигуровки к уплате в НАП - ДОО, УПФ, ЗО',
    examples_ru: ['Начислены осигуровки за месяц'],
  },
  {
    code: '493',
    name_bg: 'Разчети по дивиденти',
    name_ru: 'Расчёты по дивидендам',
    class: 4,
    type: 'passive',
    normalBalance: 'credit',
    description_ru: 'Начисленные но не выплаченные дивиденды',
    examples_ru: ['Начислены дивиденды собственнику'],
  },

  // KLAS 5 - FINANSOVI SREDSTVA
  {
    code: '501',
    name_bg: 'Каса',
    name_ru: 'Касса (наличные)',
    class: 5,
    type: 'active',
    normalBalance: 'debit',
    description_ru: 'Наличные деньги в кассе компании',
    examples_ru: ['Снятие наличных', 'Оплата наличными'],
  },
  {
    code: '503',
    name_bg: 'Разплащателна сметка',
    name_ru: 'Расчётный счёт в банке',
    class: 5,
    type: 'active',
    normalBalance: 'debit',
    description_ru: 'Основной банковский счёт компании в EUR',
    examples_ru: ['Получение оплаты от клиента', 'Оплата поставщику'],
  },
  {
    code: '504',
    name_bg: 'Акредитиви',
    name_ru: 'Валютный счёт',
    class: 5,
    type: 'active',
    normalBalance: 'debit',
    description_ru: 'Счёт в иностранной валюте (USD, GBP и др.)',
    examples_ru: ['Получение оплаты в USD'],
  },

  // KLAS 6 - RAZHODI
  {
    code: '601',
    name_bg: 'Разходи за материали',
    name_ru: 'Расходы на материалы',
    class: 6,
    type: 'active',
    normalBalance: 'debit',
    description_ru: 'Канцтовары, расходные материалы',
    examples_ru: ['Бумага для офиса', 'Картриджи'],
  },
  {
    code: '602',
    name_bg: 'Разходи за външни услуги',
    name_ru: 'Расходы на внешние услуги',
    class: 6,
    type: 'active',
    normalBalance: 'debit',
    description_ru: 'Хостинг, подписки, услуги подрядчиков, аренда офиса',
    examples_ru: ['AWS/GCP/Azure', 'Аренда офиса', 'Услуги фрилансера', 'GitHub', 'Figma'],
  },
  {
    code: '603',
    name_bg: 'Разходи за амортизация',
    name_ru: 'Расходы на амортизацию',
    class: 6,
    type: 'active',
    normalBalance: 'debit',
    description_ru: 'Амортизация основных средств - компьютеры 50%, авто 25%',
    examples_ru: ['Годовая амортизация MacBook', 'Амортизация автомобиля'],
  },
  {
    code: '604',
    name_bg: 'Разходи за заплати',
    name_ru: 'Расходы на зарплату',
    class: 6,
    type: 'active',
    normalBalance: 'debit',
    description_ru: 'Начисленная брутто зарплата сотрудников',
    examples_ru: ['Зарплата разработчика', 'Зарплата менеджера'],
  },
  {
    code: '605',
    name_bg: 'Разходи за осигурителни вноски',
    name_ru: 'Расходы на социальные взносы',
    class: 6,
    type: 'active',
    normalBalance: 'debit',
    description_ru: 'Осигуровки работодателя - ДОО, УПФ, ЗО, ОЗМ, ТЗПБ',
    examples_ru: ['Осигуровки за сотрудника'],
  },
  {
    code: '606',
    name_bg: 'Разходи за данъци',
    name_ru: 'Расходы на налоги',
    class: 6,
    type: 'active',
    normalBalance: 'debit',
    description_ru: 'Местные налоги - данък МПС, такси',
    examples_ru: ['Налог на автомобиль в общину'],
  },
  {
    code: '609',
    name_bg: 'Други разходи',
    name_ru: 'Прочие расходы',
    class: 6,
    type: 'active',
    normalBalance: 'debit',
    description_ru: 'Представительные расходы, командировки, прочее',
    examples_ru: ['Командировка', 'Деловой обед', 'Реклама'],
  },

  // KLAS 7 - PRIHODI
  {
    code: '703',
    name_bg: 'Приходи от продажби на услуги',
    name_ru: 'Доходы от продажи услуг',
    class: 7,
    type: 'passive',
    normalBalance: 'credit',
    description_ru: 'Основной доход IT компании - разработка, консалтинг, SaaS',
    examples_ru: ['Оплата от клиента за разработку', 'SaaS подписка', 'Консалтинг'],
  },
  {
    code: '705',
    name_bg: 'Приходи от продажби на стоки',
    name_ru: 'Доходы от продажи товаров',
    class: 7,
    type: 'passive',
    normalBalance: 'credit',
    description_ru: 'Продажа физических товаров',
    examples_ru: ['Продажа лицензии на ПО'],
  },
  {
    code: '721',
    name_bg: 'Приходи от дивиденти',
    name_ru: 'Доходы от дивидендов',
    class: 7,
    type: 'passive',
    normalBalance: 'credit',
    description_ru: 'Полученные дивиденды от дочерних компаний',
    examples_ru: ['Дивиденды от дочерней компании'],
  },
  {
    code: '729',
    name_bg: 'Други финансови приходи',
    name_ru: 'Прочие финансовые доходы',
    class: 7,
    type: 'passive',
    normalBalance: 'credit',
    description_ru: 'Проценты по счёту, курсовые разницы',
    examples_ru: ['Проценты банка', 'Курсовая разница'],
  },

  // KLAS 9 - SOBSTVEN KAPITAL
  {
    code: '101',
    name_bg: 'Основен капитал',
    name_ru: 'Уставный капитал',
    class: 9,
    type: 'passive',
    normalBalance: 'credit',
    description_ru: 'Минимальный уставный капитал ООД - 2 лв. (≈ 1.02 EUR)',
    examples_ru: ['Внесение уставного капитала при регистрации'],
  },
  {
    code: '122',
    name_bg: 'Неразпределена печалба',
    name_ru: 'Нераспределённая прибыль',
    class: 9,
    type: 'passive',
    normalBalance: 'credit',
    description_ru: 'Накопленная прибыль прошлых лет',
    examples_ru: ['Перенос прибыли прошлого года'],
  },
  {
    code: '123',
    name_bg: 'Непокрита загуба',
    name_ru: 'Непокрытый убыток',
    class: 9,
    type: 'active',
    normalBalance: 'debit',
    description_ru: 'Накопленный убыток - при наличии нельзя выплачивать дивиденды',
    examples_ru: ['Убыток прошлого года'],
  },
  {
    code: '124',
    name_bg: 'Резерви',
    name_ru: 'Резервы',
    class: 9,
    type: 'passive',
    normalBalance: 'credit',
    description_ru: 'Резервный фонд и прочие резервы',
    examples_ru: ['Отчисления в резервный фонд'],
  },
]

export function getAccount(code: string): Account | undefined {
  return CHART_OF_ACCOUNTS.find((a) => a.code === code)
}

export function getAccountsByClass(cls: number): Account[] {
  return CHART_OF_ACCOUNTS.filter((a) => a.class === cls)
}

export function getActiveAccounts(): Account[] {
  return CHART_OF_ACCOUNTS.filter((a) => a.type === 'active')
}

export function getPassiveAccounts(): Account[] {
  return CHART_OF_ACCOUNTS.filter((a) => a.type === 'passive')
}

export const CLASS_LABELS: Record<number, string> = {
  2: 'Дълготрайни активи',
  4: 'Разчети',
  5: 'Финансови средства',
  6: 'Разходи',
  7: 'Приходи',
  9: 'Собствен капитал',
}
