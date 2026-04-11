import { useState, useEffect } from 'react'
import { fillVisaForm, TEST_FORM_DATA } from '../../lib/visaFormFiller'
import type { VisaFormData } from '../../lib/visaFormFiller'

// ── Types ────────────────────────────────────────────────
type FormData = VisaFormData
type SpouseData = VisaFormData['spouse']
type ChildData = VisaFormData['children'][number]
type BulgariaVisit = VisaFormData['bulgariaVisits'][number]

// Restrict handle() to string-valued fields only
type StringField = {
  [K in keyof FormData]: FormData[K] extends string ? K : never
}[keyof FormData]

// ── Constants ────────────────────────────────────────────
const EMPTY_SPOUSE: SpouseData = {
  lastName: '', formerLastName: '', firstName: '',
  birthDate: '', nationality: '', formerNationality: '',
  address: '',
}

const EMPTY_CHILD: ChildData = {
  lastName: '', firstName: '',
  birthDate: '', birthPlace: '', nationality: '', address: '',
}

const EMPTY: FormData = {
  lastName: '', formerLastName: '', firstName: '',
  birthDate: '', birthPlace: '', birthCountry: '',
  nationality: '', nationalityAtBirth: '',
  otherNationality: '', previousNationalities: '',
  gender: '', homeAddress: '',
  phone: '', email: '',
  passportType: 'Общегражданский паспорт',
  passportNumber: '', passportIssueDate: '',
  passportExpiry: '', passportIssuedBy: '',
  nationalId: '',
  maritalStatus: '',
  spouse: EMPTY_SPOUSE,
  children: [],
  purpose: 'Другое — StartUp Visa / Инновационный бизнес',
  purposeCategory: 'other',
  arrivalDate: '',
  visitedBulgariaBefore: 'no',
  bulgariaVisits: [
    { dateFrom: '', dateTo: '', place: '' },
    { dateFrom: '', dateTo: '', place: '' },
    { dateFrom: '', dateTo: '', place: '' },
  ],
  thirdCountryResidence: 'no',
  thirdCountryPermitNum: '', thirdCountryPermitExpiry: '',
  thirdCountryStayFrom: '', thirdCountryStayTo: '',
  dateFrom: '', dateTo: '',
  bulgAddressCity: '', bulgAddressStreet: '',
  liveOutsideBulgaria: 'no',
  familyTraveling: 'no', familyTravelingDetails: '',
  occupation: '', employer: '', employerAddress: '',
  otherPurposeInfo: '',
  previousVisaRefused: 'no', previousVisaRefusedDetails: '',
  hasCriminalRecord: 'no', criminalRecordDetails: '',
  wasDeported: 'no', deportedDetails: '',
  hasInfectiousDisease: 'no',
  financialMeans: 'self',
  financialMeansType: ['cash'],
}

// ── Styles (static, defined once outside) ───────────────
const inputBase: React.CSSProperties = {
  border: '1.5px solid var(--border)',
  backgroundColor: 'var(--surface)',
  color: 'var(--text-primary)',
  borderRadius: '0.75rem',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
}

const labelBase: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: '0.75rem',
  display: 'block',
  marginBottom: '0.25rem',
}

// ── Field component — OUTSIDE StartupFormTab ─────────────
// CRITICAL: must be outside to avoid remount on every keystroke

interface FieldProps {
  id: string  // string (not keyof FormData) — supports dynamic IDs like child_0_lastName
  label: string
  value: string
  onChange: (e: React.ChangeEvent<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >) => void
  required?: boolean
  hint?: string
  type?: string
  options?: string[]
  rows?: number
}

function Field({
  id, label, value, onChange,
  required = false, hint, type = 'text', options, rows,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} style={labelBase}>
        {label}
        {required && (
          <span style={{ color: 'var(--danger)', marginLeft: 2 }}>
            *
          </span>
        )}
      </label>
      {options ? (
        <select id={id} name={id} value={value} onChange={onChange} style={inputBase}>
          {options.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : rows ? (
        <textarea id={id} name={id} value={value} onChange={onChange}
          rows={rows}
          style={{ ...inputBase, resize: 'vertical' }} />
      ) : (
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={onChange}
          style={inputBase}
          onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
        />
      )}
      {hint && (
        <p style={{
          color: 'var(--text-muted)',
          fontSize: '0.7rem',
          marginTop: '0.25rem',
        }}>
          💡 {hint}
        </p>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────
export default function StartupFormTab() {
  const [form, setForm] = useState<FormData>(() => {
    try {
      const saved = localStorage.getItem('startupVisaForm')
      return saved ? { ...EMPTY, ...JSON.parse(saved) } : EMPTY
    } catch {
      return EMPTY
    }
  })
  const [showInstructions, setShowInstructions] = useState(true)

  useEffect(() => {
    try {
      localStorage.setItem('startupVisaForm', JSON.stringify(form))
    } catch {}
  }, [form])

  // Flat string field handler
  const handle = (field: StringField) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value } as unknown as FormData))

  // Nested handlers
  const handleSpouse = (field: keyof SpouseData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({
        ...prev,
        spouse: { ...prev.spouse, [field]: e.target.value },
      }))

  const handleChild = (idx: number, field: keyof ChildData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => {
        const children = [...prev.children]
        children[idx] = { ...children[idx], [field]: e.target.value }
        return { ...prev, children }
      })

  const addChild = () => setForm(prev => ({
    ...prev,
    children: [
      ...prev.children,
      { ...EMPTY_CHILD },
    ],
  }))

  const removeChild = (idx: number) => setForm(prev => ({
    ...prev,
    children: prev.children.filter((_, i) => i !== idx),
  }))

  const handleVisit = (idx: number, field: keyof BulgariaVisit) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => {
        const visits = [...prev.bulgariaVisits]
        visits[idx] = { ...visits[idx], [field]: e.target.value }
        return { ...prev, bulgariaVisits: visits }
      })

  return (
    <div className="space-y-5 p-6 max-w-2xl mx-auto">

      {/* Instructions toggle */}
      <button
        onClick={() => setShowInstructions(s => !s)}
        className="w-full flex items-center justify-between
                   rounded-xl px-4 py-3"
        style={{ backgroundColor: 'var(--accent-light)',
                 border: '1px solid var(--accent)' }}>
        <div className="flex items-center gap-2">
          <span>📋</span>
          <span className="text-sm font-semibold"
            style={{ color: 'var(--accent-text)' }}>
            Инструкция по заполнению анкеты
          </span>
        </div>
        <span className="text-xs"
          style={{ color: 'var(--accent)' }}>
          {showInstructions ? '▲ свернуть' : '▼ показать'}
        </span>
      </button>

      {showInstructions && (
        <div className="rounded-xl p-4 space-y-2"
          style={{ backgroundColor: 'var(--surface-card)',
                   border: '1px solid var(--border)' }}>
          {[
            'Анкета заполняется в печатном виде (машинопечать). Рукописные не принимаются.',
            'Фамилия и имя — ЛАТИНИЦЕЙ, точно как в загранпаспорте.',
            'Все остальные поля — на русском языке.',
            'Распечатать с обеих сторон листа (двусторонняя печать).',
            'Подписать лично в 3 местах — страница 1 и страница 3.',
            'Правая колонка полей — служебная, заполняется консулом, не трогать.',
            'Никаких исправлений, замазок, зачёркиваний.',
            'Поле "Цель поездки": выбрать "Другое" → написать "StartUp Visa / Инновационный бизнес".',
            'Количество дней: 180 для визы D.',
            'Скачать актуальный бланк на сайте МИД Болгарии (ссылка ниже).',
          ].map((item, i) => (
            <p key={i} className="text-xs"
              style={{ color: 'var(--text-secondary)' }}>
              {i + 1}. {item}
            </p>
          ))}
          <a href="https://www.mfa.bg/ru/embassies/russia/1773"
            target="_blank" rel="noreferrer"
            className="inline-block mt-2 rounded-xl px-4 py-2
                       text-xs font-medium text-white"
            style={{ backgroundColor: 'var(--accent)' }}>
            Скачать бланк анкеты МИД →
          </a>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          FORM FIELDS
         ══════════════════════════════════════════════════════ */}
      <div className="space-y-4">

        {/* ── ЛИЧНЫЕ ДАННЫЕ ─────────────────────────────────── */}
        <p className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}>
          Поля 1–10 · Личные данные
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Field id="lastName" label="1. Фамилия (латиница)" required
            value={form.lastName} onChange={handle('lastName')}
            hint="Как в паспорте: IVANOV" />
          <Field id="formerLastName" label="2. Фамилия при рождении"
            value={form.formerLastName} onChange={handle('formerLastName')}
            hint="Если отличается от текущей" />
        </div>

        <Field id="firstName" label="3. Имя(на) (латиница)" required
          value={form.firstName} onChange={handle('firstName')}
          hint="Как в паспорте: IVAN" />

        <div className="grid grid-cols-3 gap-3">
          <Field id="birthDate" label="4. Дата рождения" required
            type="date" value={form.birthDate}
            onChange={handle('birthDate')} />
          <Field id="birthPlace" label="5. Место рождения" required
            value={form.birthPlace} onChange={handle('birthPlace')} />
          <Field id="birthCountry" label="6. Страна рождения" required
            value={form.birthCountry} onChange={handle('birthCountry')} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field id="nationality" label="7. Нынешнее гражданство" required
            value={form.nationality} onChange={handle('nationality')} />
          <Field id="nationalityAtBirth"
            label="7. Гражданство при рождении"
            value={form.nationalityAtBirth}
            onChange={handle('nationalityAtBirth')}
            hint="Если отличается" />
          <Field id="otherNationality" label="7. Иное гражданство"
            value={form.otherNationality}
            onChange={handle('otherNationality')} />
        </div>

        <Field id="previousNationalities"
          label="8. Предыдущие гражданства (даты и основания)"
          value={form.previousNationalities}
          onChange={handle('previousNationalities')}
          hint="Если были другие гражданства — укажите даты и основания" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={labelBase}>
              9. Пол <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div className="flex gap-4 mt-1">
              {[['M', 'Мужской'], ['F', 'Женский']].map(([val, lbl]) => (
                <label key={val}
                  className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="gender" value={val}
                    checked={form.gender === val}
                    onChange={handle('gender')} />
                  <span className="text-sm"
                    style={{ color: 'var(--text-secondary)' }}>
                    {lbl}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <Field id="nationalId" label="16. Национальный ID номер"
            value={form.nationalId} onChange={handle('nationalId')}
            hint="ИНН, СНИЛС или аналог — если применимо" />
        </div>

        <Field id="homeAddress" label="10. Постоянный адрес" required
          value={form.homeAddress} onChange={handle('homeAddress')}
          hint="Страна, город, улица, дом" />
        <div className="grid grid-cols-2 gap-3">
          <Field id="email" label="10. Email" required type="email"
            value={form.email} onChange={handle('email')} />
          <Field id="phone" label="10. Телефон" required
            value={form.phone} onChange={handle('phone')}
            hint="+7 / +380 с кодом" />
        </div>

        {/* ── ПАСПОРТ ───────────────────────────────────────── */}
        <p className="text-xs font-semibold uppercase tracking-wider pt-2"
          style={{ color: 'var(--text-muted)' }}>
          Поля 11–15 · Документ для выезда
        </p>

        <div>
          <label style={labelBase}>
            11. Тип документа
            <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <div className="flex gap-3 flex-wrap mt-1">
            {[
              'Общегражданский паспорт',
              'Дипломатический паспорт',
              'Служебный паспорт',
              'Иной документ',
            ].map(t => (
              <label key={t}
                className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="passportType" value={t}
                  checked={form.passportType === t}
                  onChange={handle('passportType')} />
                <span className="text-xs"
                  style={{ color: 'var(--text-secondary)' }}>
                  {t}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field id="passportNumber" label="12. Номер паспорта" required
            value={form.passportNumber}
            onChange={handle('passportNumber')} />
          <Field id="passportIssuedBy"
            label="15. Выдан кем (страна)" required
            value={form.passportIssuedBy}
            onChange={handle('passportIssuedBy')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field id="passportIssueDate" label="13. Дата выдачи" required
            type="date" value={form.passportIssueDate}
            onChange={handle('passportIssueDate')} />
          <Field id="passportExpiry" label="14. Действителен до" required
            type="date" value={form.passportExpiry}
            onChange={handle('passportExpiry')}
            hint="≥18 мес. от даты подачи" />
        </div>

        {/* ── СЕМЕЙНОЕ ПОЛОЖЕНИЕ ────────────────────────────── */}
        <p className="text-xs font-semibold uppercase tracking-wider pt-2"
          style={{ color: 'var(--text-muted)' }}>
          Поля 17–20 · Семейное положение
        </p>

        <div>
          <label style={labelBase}>
            17. Семейное положение
            <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <div className="flex gap-3 flex-wrap mt-1">
            {[
              'Холост/Не замужем',
              'Женат/Замужем',
              'Зарег. партнёрство',
              'Живущий отдельно',
              'Разведён/а',
              'Вдовец/Вдова',
            ].map(s => (
              <label key={s}
                className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="maritalStatus" value={s}
                  checked={form.maritalStatus === s}
                  onChange={handle('maritalStatus')} />
                <span className="text-xs"
                  style={{ color: 'var(--text-secondary)' }}>
                  {s}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Field 18 — spouse */}
        {(form.maritalStatus === 'Женат/Замужем' ||
          form.maritalStatus === 'Зарег. партнёрство') && (
          <div className="rounded-xl p-4 space-y-3"
            style={{ backgroundColor: 'var(--surface)',
                     border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold"
              style={{ color: 'var(--text-primary)' }}>
              18. Сведения о супруге / партнёре
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field id="spouse_lastName"
                label="Фамилия" required
                value={form.spouse.lastName}
                onChange={handleSpouse('lastName')} />
              <Field id="spouse_formerLastName"
                label="Предыдущая фамилия"
                value={form.spouse.formerLastName}
                onChange={handleSpouse('formerLastName')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="spouse_firstName"
                label="Имя(на)" required
                value={form.spouse.firstName}
                onChange={handleSpouse('firstName')} />
              <Field id="spouse_birthDate"
                label="Дата рождения" type="date"
                value={form.spouse.birthDate}
                onChange={handleSpouse('birthDate')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="spouse_nationality"
                label="Гражданство"
                value={form.spouse.nationality}
                onChange={handleSpouse('nationality')} />
              <Field id="spouse_formerNationality"
                label="Предыдущее гражданство"
                value={form.spouse.formerNationality}
                onChange={handleSpouse('formerNationality')} />
            </div>
            <Field id="spouse_address"
              label="Место жительства"
              value={form.spouse.address}
              onChange={handleSpouse('address')} />
          </div>
        )}

        {/* Field 19 — children */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold"
              style={{ color: 'var(--text-primary)' }}>
              19. Дети (включая совершеннолетних)
            </p>
            <button type="button" onClick={addChild}
              className="rounded-xl px-3 py-1.5 text-xs font-medium"
              style={{
                backgroundColor: 'var(--accent-light)',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
              }}>
              + Добавить ребёнка
            </button>
          </div>

          {form.children.length === 0 && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Нажмите "+ Добавить ребёнка" если есть дети
            </p>
          )}

          {form.children.map((child, idx) => (
            <div key={idx}
              className="rounded-xl p-4 space-y-3"
              style={{ backgroundColor: 'var(--surface)',
                       border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold"
                  style={{ color: 'var(--text-primary)' }}>
                  Ребёнок {idx + 1}
                </p>
                <button type="button" onClick={() => removeChild(idx)}
                  className="text-xs"
                  style={{ color: 'var(--danger)' }}>
                  Удалить
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field id={`child_${idx}_lastName`}
                  label="Фамилия" required
                  value={child.lastName}
                  onChange={handleChild(idx, 'lastName')} />
                <Field id={`child_${idx}_firstName`}
                  label="Имя(на)" required
                  value={child.firstName}
                  onChange={handleChild(idx, 'firstName')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field id={`child_${idx}_birthDate`}
                  label="Дата рождения" type="date"
                  value={child.birthDate}
                  onChange={handleChild(idx, 'birthDate')} />
                <Field id={`child_${idx}_birthPlace`}
                  label="Место рождения"
                  value={child.birthPlace}
                  onChange={handleChild(idx, 'birthPlace')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field id={`child_${idx}_nationality`}
                  label="Гражданство"
                  value={child.nationality}
                  onChange={handleChild(idx, 'nationality')} />
                <Field id={`child_${idx}_address`}
                  label="Место жительства"
                  value={child.address}
                  onChange={handleChild(idx, 'address')} />
              </div>
            </div>
          ))}
        </div>

        {/* ── ЦЕЛЬ ПОЕЗДКИ ──────────────────────────────────── */}
        <p className="text-xs font-semibold uppercase tracking-wider pt-2"
          style={{ color: 'var(--text-muted)' }}>
          Поля 21–22 · Цель поездки
        </p>

        <div>
          <label style={labelBase}>
            21. Цель поездки
            <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <div className="flex gap-3 flex-wrap mt-1">
            {[
              ['work',    'Работа'],
              ['family',  'Воссоединение семьи'],
              ['study',   'Обучение'],
              ['pension', 'Пенсионер'],
              ['medical', 'Медицина'],
              ['sport',   'Спорт'],
              ['culture', 'Культура'],
              ['other',   'Иное (StartUp Visa)'],
            ].map(([val, lbl]) => (
              <label key={val}
                className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="purposeCategory" value={val}
                  checked={form.purposeCategory === val}
                  onChange={handle('purposeCategory')} />
                <span className="text-xs"
                  style={{ color: 'var(--text-secondary)' }}>
                  {lbl}
                </span>
              </label>
            ))}
          </div>
        </div>

        {form.purposeCategory === 'other' && (
          <Field id="purpose"
            label="21. Уточнение цели (Иное)"
            required
            value={form.purpose} onChange={handle('purpose')}
            hint='Для Startup Visa: "StartUp Visa / Инновационный бизнес"' />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field id="arrivalDate" label="22. Планируемая дата приезда"
            required type="date"
            value={form.arrivalDate} onChange={handle('arrivalDate')} />
          <Field id="dateFrom" label="25. Пребывание с"
            required type="date"
            value={form.dateFrom} onChange={handle('dateFrom')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field id="dateTo" label="25. Пребывание до"
            required type="date"
            value={form.dateTo} onChange={handle('dateTo')} />
          </div>

        {/* ── ПРЕДЫДУЩИЕ ВИЗИТЫ В БОЛГАРИЮ ──────────────────── */}
        <p className="text-xs font-semibold uppercase tracking-wider pt-2"
          style={{ color: 'var(--text-muted)' }}>
          Поле 23 · Предыдущие визиты в Болгарию
        </p>

        <div>
          <label style={labelBase}>
            23. Пребывали ли раньше в Болгарии?
            <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <div className="flex gap-4 mt-1">
            {[['yes', 'Да'], ['no', 'Нет']].map(([val, lbl]) => (
              <label key={val}
                className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="visitedBulgariaBefore"
                  value={val}
                  checked={form.visitedBulgariaBefore === val}
                  onChange={handle('visitedBulgariaBefore')} />
                <span className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}>
                  {lbl}
                </span>
              </label>
            ))}
          </div>
        </div>

        {form.visitedBulgariaBefore === 'yes' && (
          <div className="space-y-2">
            <p className="text-xs"
              style={{ color: 'var(--text-muted)' }}>
              Укажите последние 3 посещения (месяц/год):
            </p>
            {form.bulgariaVisits.map((visit, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-2">
                <Field id={`visit_${idx}_from`}
                  label={`Визит ${idx + 1} — с`} type="month"
                  value={visit.dateFrom}
                  onChange={handleVisit(idx, 'dateFrom')} />
                <Field id={`visit_${idx}_to`}
                  label="до" type="month"
                  value={visit.dateTo}
                  onChange={handleVisit(idx, 'dateTo')} />
                <Field id={`visit_${idx}_place`}
                  label="место"
                  value={visit.place}
                  onChange={handleVisit(idx, 'place')} />
              </div>
            ))}
          </div>
        )}

        {/* ── ТРЕТЬЯ СТРАНА ─────────────────────────────────── */}
        <p className="text-xs font-semibold uppercase tracking-wider pt-2"
          style={{ color: 'var(--text-muted)' }}>
          Поле 24 · Пребывание в третьей стране
        </p>

        <div>
          <label style={labelBase}>
            24. Проживаете в стране, отличной от страны гражданства?
            <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <div className="flex gap-4 mt-1">
            {[['yes', 'Да'], ['no', 'Нет']].map(([val, lbl]) => (
              <label key={val}
                className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="thirdCountryResidence"
                  value={val}
                  checked={form.thirdCountryResidence === val}
                  onChange={handle('thirdCountryResidence')} />
                <span className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}>
                  {lbl}
                </span>
              </label>
            ))}
          </div>
        </div>

        {form.thirdCountryResidence === 'yes' && (
          <div className="grid grid-cols-2 gap-3">
            <Field id="thirdCountryPermitNum"
              label="Номер разрешения на пребывание"
              value={form.thirdCountryPermitNum}
              onChange={handle('thirdCountryPermitNum')} />
            <Field id="thirdCountryPermitExpiry"
              label="Действителен до" type="date"
              value={form.thirdCountryPermitExpiry}
              onChange={handle('thirdCountryPermitExpiry')} />
            <Field id="thirdCountryStayFrom"
              label="Пребывание с" type="date"
              value={form.thirdCountryStayFrom}
              onChange={handle('thirdCountryStayFrom')} />
            <Field id="thirdCountryStayTo"
              label="Пребывание до" type="date"
              value={form.thirdCountryStayTo}
              onChange={handle('thirdCountryStayTo')} />
          </div>
        )}

        {/* ── МЕСТО ПРЕБЫВАНИЯ В БОЛГАРИИ ───────────────────── */}
        <p className="text-xs font-semibold uppercase tracking-wider pt-2"
          style={{ color: 'var(--text-muted)' }}>
          Поля 26–28 · Пребывание в Болгарии
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Field id="bulgAddressCity" label="26. Город" required
            value={form.bulgAddressCity}
            onChange={handle('bulgAddressCity')}
            hint="София / Варна / Бургас" />
          <Field id="bulgAddressStreet" label="26. Улица, дом" required
            value={form.bulgAddressStreet}
            onChange={handle('bulgAddressStreet')} />
        </div>

        <div>
          <label style={labelBase}>
            27. Намерены проживать за пределами Болгарии?
          </label>
          <div className="flex gap-4 mt-1">
            {[['yes', 'Да'], ['no', 'Нет']].map(([val, lbl]) => (
              <label key={val}
                className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="liveOutsideBulgaria"
                  value={val}
                  checked={form.liveOutsideBulgaria === val}
                  onChange={handle('liveOutsideBulgaria')} />
                <span className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}>
                  {lbl}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label style={labelBase}>
            28. Члены семьи путешествуют с вами?
          </label>
          <div className="flex gap-4 mt-1">
            {[['yes', 'Да'], ['no', 'Нет']].map(([val, lbl]) => (
              <label key={val}
                className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="familyTraveling"
                  value={val}
                  checked={form.familyTraveling === val}
                  onChange={handle('familyTraveling')} />
                <span className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}>
                  {lbl}
                </span>
              </label>
            ))}
          </div>
        </div>

        {form.familyTraveling === 'yes' && (
          <Field id="familyTravelingDetails"
            label="28. Кто именно путешествует с вами"
            value={form.familyTravelingDetails}
            onChange={handle('familyTravelingDetails')}
            hint="ФИО, степень родства" />
        )}

        {/* ── ЗАНЯТОСТЬ ─────────────────────────────────────── */}
        <p className="text-xs font-semibold uppercase tracking-wider pt-2"
          style={{ color: 'var(--text-muted)' }}>
          Поля 29–31 · Занятость и цель проживания
        </p>

        <Field id="occupation" label="29. Нынешняя профессия" required
          value={form.occupation} onChange={handle('occupation')}
          hint="Founder / Директор / IT-предприниматель" />
        <Field id="employer" label="30. Работодатель / компания" required
          value={form.employer} onChange={handle('employer')} />
        <Field id="employerAddress" label="30. Адрес работодателя"
          value={form.employerAddress}
          onChange={handle('employerAddress')} />
        <Field id="otherPurposeInfo"
          label="31. Другая информация о цели проживания"
          value={form.otherPurposeInfo}
          onChange={handle('otherPurposeInfo')}
          rows={3}
          hint="Опишите подробнее суть стартап-проекта, планы в Болгарии" />

        {/* ── ЮРИДИЧЕСКИЕ ВОПРОСЫ ───────────────────────────── */}
        <p className="text-xs font-semibold uppercase tracking-wider pt-2"
          style={{ color: 'var(--text-muted)' }}>
          Поля 32–35 · Юридические вопросы
        </p>

        {/* Field 32 */}
        <div>
          <label style={labelBase}>
            32. Было ли отклонено заявление на ВНЖ или отказано
            во въезде в Болгарию?
            <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <div className="flex gap-4 mt-1">
            {[['yes', 'Да'], ['no', 'Нет']].map(([val, lbl]) => (
              <label key={val}
                className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="previousVisaRefused"
                  value={val}
                  checked={form.previousVisaRefused === val}
                  onChange={handle('previousVisaRefused')} />
                <span className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}>
                  {lbl}
                </span>
              </label>
            ))}
          </div>
        </div>
        {form.previousVisaRefused === 'yes' && (
          <Field id="previousVisaRefusedDetails"
            label="32. Укажите период и причину"
            required rows={2}
            value={form.previousVisaRefusedDetails}
            onChange={handle('previousVisaRefusedDetails')} />
        )}

        {/* Field 33 */}
        <div>
          <label style={labelBase}>
            33. Есть ли у вас судимость?
            <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <div className="flex gap-4 mt-1">
            {[['yes', 'Да'], ['no', 'Нет']].map(([val, lbl]) => (
              <label key={val}
                className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="hasCriminalRecord"
                  value={val}
                  checked={form.hasCriminalRecord === val}
                  onChange={handle('hasCriminalRecord')} />
                <span className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}>
                  {lbl}
                </span>
              </label>
            ))}
          </div>
        </div>
        {form.hasCriminalRecord === 'yes' && (
          <Field id="criminalRecordDetails"
            label="33. Страна, деяние, наказание"
            required rows={2}
            value={form.criminalRecordDetails}
            onChange={handle('criminalRecordDetails')} />
        )}

        {/* Field 34 */}
        <div>
          <label style={labelBase}>
            34. Высылались или депортировались из Болгарии?
            <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <div className="flex gap-4 mt-1">
            {[['yes', 'Да'], ['no', 'Нет']].map(([val, lbl]) => (
              <label key={val}
                className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="wasDeported"
                  value={val}
                  checked={form.wasDeported === val}
                  onChange={handle('wasDeported')} />
                <span className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}>
                  {lbl}
                </span>
              </label>
            ))}
          </div>
        </div>
        {form.wasDeported === 'yes' && (
          <Field id="deportedDetails"
            label="34. Укажите период и причину"
            required rows={2}
            value={form.deportedDetails}
            onChange={handle('deportedDetails')} />
        )}

        {/* Field 35 */}
        <div>
          <label style={labelBase}>
            35. Инфекционные заболевания (оспа, полиомиелит,
            птичий/свиной грипп, SARS, холера, чума, Эбола и др.)?
            <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <div className="flex gap-4 mt-1">
            {[['yes', 'Да'], ['no', 'Нет']].map(([val, lbl]) => (
              <label key={val}
                className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="hasInfectiousDisease"
                  value={val}
                  checked={form.hasInfectiousDisease === val}
                  onChange={handle('hasInfectiousDisease')} />
                <span className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}>
                  {lbl}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* ── ФИНАНСЫ ───────────────────────────────────────── */}
        <p className="text-xs font-semibold uppercase tracking-wider pt-2"
          style={{ color: 'var(--text-muted)' }}>
          Поле 36 · Финансовое обеспечение
        </p>

        <div>
          <label style={labelBase}>
            36. Расходы покрываются за счёт
            <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <div className="flex gap-3 flex-wrap mt-1">
            {[
              ['self',     'Собственных средств'],
              ['sponsor',  'Спонсора / приглашающего'],
              ['employer', 'Работодателя (поле 30)'],
            ].map(([val, lbl]) => (
              <label key={val}
                className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="financialMeans" value={val}
                  checked={form.financialMeans === val}
                  onChange={handle('financialMeans')} />
                <span className="text-xs"
                  style={{ color: 'var(--text-secondary)' }}>
                  {lbl}
                </span>
              </label>
            ))}
          </div>
        </div>

        {form.financialMeans === 'self' && (
          <div>
            <label style={labelBase}>
              36. Средства на содержание (отметьте все применимые)
            </label>
            <div className="flex gap-3 flex-wrap mt-1">
              {[
                ['cash',      'Наличные'],
                ['travcheck', 'Дорожные чеки'],
                ['card',      'Кредитная карта'],
                ['accom',     'Предоплаченное жильё'],
                ['transport', 'Предоплаченный транспорт'],
              ].map(([val, lbl]) => (
                <label key={val}
                  className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" value={val}
                    checked={form.financialMeansType.includes(val)}
                    onChange={e => setForm(prev => ({
                      ...prev,
                      financialMeansType: e.target.checked
                        ? [...prev.financialMeansType, val]
                        : prev.financialMeansType.filter(v => v !== val),
                    }))} />
                  <span className="text-xs"
                    style={{ color: 'var(--text-secondary)' }}>
                    {lbl}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-right"
        style={{ color: 'var(--text-muted)' }}>
        ✓ Данные сохраняются автоматически
      </p>

      {/* Action block */}
      <div className="rounded-xl p-4 space-y-3"
        style={{ backgroundColor: 'var(--surface)',
                 border: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}>
          📄 Как использовать эти данные
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={async () => {
              try {
                await fillVisaForm(form)
              } catch (err) {
                alert('Ошибка: ' + (err as Error).message)
              }
            }}
            className="rounded-xl px-4 py-2 text-xs font-medium text-white"
            style={{ backgroundColor: 'var(--accent)' }}>
            ⬇ Скачать заполненную анкету МИД
          </button>
          <button
            onClick={async () => {
              try {
                await fillVisaForm(TEST_FORM_DATA)
              } catch (err) {
                alert('Ошибка теста: ' + (err as Error).message)
              }
            }}
            className="rounded-xl px-4 py-2 text-xs font-medium"
            style={{
              border: '1.5px solid var(--border)',
              color: 'var(--text-muted)',
              backgroundColor: 'transparent',
            }}>
            🧪 Тест заполнения
          </button>
          <a href="/visa_d_blank.pdf"
            download="Анкета_виза_D_пустой_бланк.pdf"
            className="rounded-xl px-4 py-2 text-xs font-medium"
            style={{
              border: '1.5px solid var(--border)',
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent',
            }}>
            📄 Пустой бланк
          </a>
          <button
            onClick={() => {
              if (confirm('Очистить все введённые данные?')) {
                setForm(EMPTY)
                localStorage.removeItem('startupVisaForm')
              }
            }}
            className="rounded-xl px-4 py-2 text-xs font-medium"
            style={{
              border: '1.5px solid var(--border)',
              color: 'var(--text-muted)',
              backgroundColor: 'transparent',
            }}>
            🗑 Очистить
          </button>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Скачанный PDF — официальный бланк МИД Болгарии
          с вашими данными. Распечатайте и подпишите лично
          в 3 местах перед подачей.
        </p>
      </div>

      {/* Common mistakes */}
      <div>
        <p className="text-xs font-semibold uppercase
                       tracking-wider mb-2"
          style={{ color: 'var(--text-muted)' }}>
          🚫 Типичные ошибки в анкете
        </p>
        <div className="space-y-2">
          {[
            'Имя и фамилия написаны кириллицей — должно быть латиницей',
            'Срок паспорта менее 18 месяцев от даты подачи',
            'Цель: выбрано "Бизнес" вместо "Другое — StartUp Visa"',
            'Анкета заполнена от руки — только машинопечать',
            'Не подписана в одном из 3 обязательных мест',
            'Заполнена правая служебная колонка — она для консула',
            'Количество дней не 180 или не совпадает с датами',
          ].map((m, i) => (
            <div key={i}
              className="flex items-start gap-2 rounded-xl p-3"
              style={{ backgroundColor: 'var(--danger-light)',
                       border: '1px solid var(--danger)' }}>
              <span className="text-xs shrink-0"
                style={{ color: 'var(--danger)' }}>✗</span>
              <p className="text-xs"
                style={{ color: 'var(--danger-text)' }}>
                {m}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
