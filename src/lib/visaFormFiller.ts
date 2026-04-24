import { PDFDocument, rgb } from 'pdf-lib'
import { embedCyrillicFonts, fitTextToWidth } from './pdfFonts'

export interface VisaFormData {
  lastName: string
  formerLastName: string
  firstName: string
  birthDate: string
  birthPlace: string
  birthCountry: string
  nationality: string
  nationalityAtBirth: string
  otherNationality: string
  previousNationalities: string
  gender: string
  homeAddress: string
  phone: string
  email: string
  passportType: string
  passportNumber: string
  passportIssueDate: string
  passportExpiry: string
  passportIssuedBy: string
  nationalId: string
  maritalStatus: string
  spouse: {
    lastName: string
    formerLastName: string
    firstName: string
    birthDate: string
    nationality: string
    formerNationality: string
    address: string
  }
  children: Array<{
    lastName: string
    firstName: string
    birthDate: string
    birthPlace: string
    nationality: string
    address: string
  }>
  purposeCategory: string
  purpose: string
  arrivalDate: string
  visitedBulgariaBefore: string
  bulgariaVisits: Array<{ dateFrom: string; dateTo: string; place: string }>
  thirdCountryResidence: string
  thirdCountryPermitNum: string
  thirdCountryPermitExpiry: string
  thirdCountryStayFrom: string
  thirdCountryStayTo: string
  dateFrom: string
  dateTo: string
  bulgAddressCity: string
  bulgAddressStreet: string
  liveOutsideBulgaria: string
  familyTraveling: string
  familyTravelingDetails: string
  occupation: string
  employer: string
  employerAddress: string
  otherPurposeInfo: string
  previousVisaRefused: string
  previousVisaRefusedDetails: string
  hasCriminalRecord: string
  criminalRecordDetails: string
  wasDeported: string
  deportedDetails: string
  hasInfectiousDisease: string
  financialMeans: string
  financialMeansType: string[]
}

// Coordinates measured from official MFA blank
// Page size: 595.3 x 841.9 pts (A4)
// [x, y_from_bottom, maxWidth, pageIndex]
export const VISA_PAGE_SIZE = {
  width: 595.32,
  height: 841.92,
} as const

export const FIELDS = {
  // PAGE 1
  f1_surname:          [145, 570, 270, 0],
  f2_formerSurname:    [145, 547, 270, 0],
  f3_firstName:        [145, 529, 270, 0],
  f4_birthDate:        [172, 484, 115, 0],
  f5_birthPlace:       [232, 498,  60, 0],
  f6_birthCountry:     [368, 498,  55, 0],
  f7_nationality:      [145, 392, 115, 0],
  f7_natAtBirth:       [172, 392, 115, 0],
  f7_otherNat:         [300, 392, 115, 0],
  f8_prevNat:          [ 51, 314, 375, 0],
  f10_address:         [172, 265, 245, 0],
  f10_email:           [295, 231, 175, 0],
  f10_phone:           [295, 203, 175, 0],
  f12_passportNum:     [ 54,  52, 165, 0],
  f13_issueDate:       [231,  64, 130, 0],
  f14_expiry:          [373,  52,  85, 0],
  f15_issuedBy:        [465,  52, 115, 0],
  // PAGE 2
  f16_nationalId:      [ 51, 736, 375, 1],
  f18_spouseLastName:  [ 57, 634, 250, 1],
  f18_spouseFormerName:[318, 634, 215, 1],
  f18_spouseFirstName: [ 57, 594, 250, 1],
  f18_spouseBirth:     [318, 594, 215, 1],
  f18_spouseNat:       [ 57, 554, 250, 1],
  f18_spouseFormerNat: [318, 554, 215, 1],
  f18_spouseAddress:   [ 57, 514, 480, 1],
  f19_child1_name:     [ 57, 422,  70, 1],
  f19_child1_firstName:[133, 422,  93, 1],
  f19_child1_birth:    [232, 422, 108, 1],
  f19_child1_nat:      [346, 422,  83, 1],
  f19_child1_addr:     [435, 422, 130, 1],
  f19_child2_name:     [ 57, 394,  70, 1],
  f19_child2_firstName:[133, 394,  93, 1],
  f19_child2_birth:    [232, 394, 108, 1],
  f19_child2_nat:      [346, 394,  83, 1],
  f19_child2_addr:     [435, 394, 130, 1],
  f21_purposeOther:    [300, 217, 240, 1],
  f22_arrival:         [ 51, 199, 375, 1],
  // PAGE 3
  f23_visit1_from:     [ 75, 702,  70, 2],
  f23_visit1_to:       [190, 702,  70, 2],
  f23_visit1_place:    [310, 702, 240, 2],
  f23_visit2_from:     [ 75, 661,  70, 2],
  f23_visit2_to:       [190, 661,  70, 2],
  f23_visit2_place:    [310, 661, 240, 2],
  f23_visit3_from:     [ 75, 621,  70, 2],
  f23_visit3_to:       [190, 621,  70, 2],
  f23_visit3_place:    [310, 621, 240, 2],
  f24_permitNum:       [200, 539, 130, 2],
  f24_permitExpiry:    [340, 539, 100, 2],
  f24_stayFrom:        [430, 523,  80, 2],
  f24_stayTo:          [ 51, 507, 200, 2],
  f25_from:            [ 58, 474, 165, 2],
  f25_to:              [310, 474, 165, 2],
  f26_address:         [ 51, 439, 490, 2],
  f27_details:         [130, 393, 360, 2],
  f28_details:         [130, 360, 360, 2],
  f29_profession:      [ 51, 312, 490, 2],
  f30_employer:        [ 51, 266, 490, 2],
  f31_other:           [ 51, 219, 490, 2],
  f32_details:         [ 51, 145, 490, 2],
  f33_details:         [ 51,  84, 490, 2],
  // PAGE 4
  f34_details:         [ 51, 732, 490, 3],
} as const satisfies Record<string, readonly [number, number, number, number]>

// Checkbox positions [x, y_from_bottom, pageIndex]
export const CHECKBOXES = {
  gender_M:        [ 51, 285, 0],
  gender_F:        [ 51, 271, 0],
  passport_civil:  [ 51, 155, 0],
  passport_diplo:  [153, 155, 0],
  passport_service:[251, 155, 0],
  passport_other:  [ 51, 141, 0],
  marital_single:  [ 57, 704, 1],
  marital_married: [153, 704, 1],
  marital_partner: [248, 704, 1],
  marital_sep:     [ 57, 690, 1],
  marital_div:     [148, 690, 1],
  marital_widow:   [232, 690, 1],
  purpose_work:    [ 51, 245, 1],
  purpose_family:  [103, 245, 1],
  purpose_culture: [230, 245, 1],
  purpose_sport:   [317, 245, 1],
  purpose_medical: [363, 245, 1],
  purpose_study:   [ 51, 231, 1],
  purpose_pension: [129, 231, 1],
  purpose_other:   [189, 231, 1],
  visited_yes:     [ 51, 761, 2],
  visited_no:      [ 75, 761, 2],
  third_no:        [ 51, 566, 2],
  third_yes:       [ 51, 552, 2],
  outside_no:      [ 51, 407, 2],
  outside_yes:     [ 75, 407, 2],
  family_no:       [ 51, 374, 2],
  family_yes:      [ 75, 374, 2],
  refused_no:      [ 51, 174, 2],
  refused_yes:     [ 75, 174, 2],
  criminal_no:     [ 51, 113, 2],
  criminal_yes:    [ 75, 113, 2],
  deported_no:     [ 51, 761, 3],
  deported_yes:    [ 75, 761, 3],
  disease_no:      [ 51, 644, 3],
  disease_yes:     [ 75, 644, 3],
  fin_self:        [ 51, 607, 3],
  fin_sponsor:     [261, 607, 3],
  fin_employer:    [261, 551, 3],
  fin_cash:        [ 51, 579, 3],
  fin_travcheck:   [ 51, 565, 3],
  fin_card:        [ 51, 551, 3],
  fin_accom:       [ 51, 537, 3],
  fin_transport:   [ 51, 523, 3],
} as const satisfies Record<string, readonly [number, number, number]>

export type VisaFieldKey = keyof typeof FIELDS
export type VisaCheckboxKey = keyof typeof CHECKBOXES

export interface VisaPdfFieldOffset {
  dx: number
  dy: number
}

export interface VisaPdfOverrides {
  text?: Partial<Record<VisaFieldKey, string>>
  offsets?: Partial<Record<VisaFieldKey, VisaPdfFieldOffset>>
}

export function buildVisaFieldValues(
  form: VisaFormData,
): Partial<Record<VisaFieldKey, string>> {
  const values: Partial<Record<VisaFieldKey, string>> = {
    f1_surname: form.lastName,
    f2_formerSurname: form.formerLastName,
    f3_firstName: form.firstName,
    f4_birthDate: form.birthDate,
    f5_birthPlace: form.birthPlace,
    f6_birthCountry: form.birthCountry,
    f7_nationality: form.nationality,
    f7_natAtBirth: form.nationalityAtBirth,
    f7_otherNat: form.otherNationality,
    f8_prevNat: form.previousNationalities,
    f10_address: form.homeAddress,
    f10_email: form.email,
    f10_phone: form.phone,
    f12_passportNum: form.passportNumber,
    f13_issueDate: form.passportIssueDate,
    f14_expiry: form.passportExpiry,
    f15_issuedBy: form.passportIssuedBy,
    f16_nationalId: form.nationalId,
    f18_spouseLastName: form.spouse.lastName,
    f18_spouseFormerName: form.spouse.formerLastName,
    f18_spouseFirstName: form.spouse.firstName,
    f18_spouseBirth: form.spouse.birthDate,
    f18_spouseNat: form.spouse.nationality,
    f18_spouseFormerNat: form.spouse.formerNationality,
    f18_spouseAddress: form.spouse.address,
    f22_arrival: form.arrivalDate || form.dateFrom,
    f25_from: form.dateFrom,
    f25_to: form.dateTo,
    f26_address: [form.bulgAddressCity, form.bulgAddressStreet]
      .filter(Boolean)
      .join(', '),
    f29_profession: form.occupation,
    f30_employer: [form.employer, form.employerAddress]
      .filter(Boolean)
      .join(', '),
    f31_other: form.otherPurposeInfo,
  }

  const kids = form.children
  if (kids[0]) {
    values.f19_child1_name = kids[0].lastName
    values.f19_child1_firstName = kids[0].firstName
    values.f19_child1_birth =
      [kids[0].birthDate, kids[0].birthPlace].filter(Boolean).join(' / ')
    values.f19_child1_nat = kids[0].nationality
    values.f19_child1_addr = kids[0].address
  }
  if (kids[1]) {
    values.f19_child2_name = kids[1].lastName
    values.f19_child2_firstName = kids[1].firstName
    values.f19_child2_birth =
      [kids[1].birthDate, kids[1].birthPlace].filter(Boolean).join(' / ')
    values.f19_child2_nat = kids[1].nationality
    values.f19_child2_addr = kids[1].address
  }

  if (form.purposeCategory === 'other') {
    values.f21_purposeOther = form.purpose
  }
  if (form.thirdCountryResidence === 'yes') {
    values.f24_permitNum = form.thirdCountryPermitNum
    values.f24_permitExpiry = form.thirdCountryPermitExpiry
    values.f24_stayFrom = form.thirdCountryStayFrom
    values.f24_stayTo = form.thirdCountryStayTo
  }
  if (form.liveOutsideBulgaria === 'yes') {
    values.f27_details = form.liveOutsideBulgaria
  }
  if (form.familyTraveling === 'yes') {
    values.f28_details = form.familyTravelingDetails
  }
  if (form.previousVisaRefused === 'yes') {
    values.f32_details = form.previousVisaRefusedDetails
  }
  if (form.hasCriminalRecord === 'yes') {
    values.f33_details = form.criminalRecordDetails
  }
  if (form.wasDeported === 'yes') {
    values.f34_details = form.deportedDetails
  }
  if (form.visitedBulgariaBefore === 'yes') {
    form.bulgariaVisits.forEach((visit, index) => {
      const n = index + 1 as 1 | 2 | 3
      values[`f23_visit${n}_from` as VisaFieldKey] = visit.dateFrom
      values[`f23_visit${n}_to` as VisaFieldKey] = visit.dateTo
      values[`f23_visit${n}_place` as VisaFieldKey] = visit.place
    })
  }

  return values
}

export function buildVisaCheckedBoxes(form: VisaFormData): VisaCheckboxKey[] {
  const checked: VisaCheckboxKey[] = []

  if (form.gender === 'M') checked.push('gender_M')
  if (form.gender === 'F') checked.push('gender_F')

  const pt = form.passportType
  if (pt.includes('Общегражд')) checked.push('passport_civil')
  else if (pt.includes('Диплом')) checked.push('passport_diplo')
  else if (pt.includes('Служеб')) checked.push('passport_service')
  else checked.push('passport_other')

  const ms = form.maritalStatus
  if (ms.includes('Холост')) checked.push('marital_single')
  else if (ms.includes('Женат')) checked.push('marital_married')
  else if (ms.includes('партнёр')) checked.push('marital_partner')
  else if (ms.includes('отдельно')) checked.push('marital_sep')
  else if (ms.includes('Разведён')) checked.push('marital_div')
  else if (ms.includes('Вдов')) checked.push('marital_widow')

  const pc = form.purposeCategory
  if (pc === 'work') checked.push('purpose_work')
  else if (pc === 'family') checked.push('purpose_family')
  else if (pc === 'culture') checked.push('purpose_culture')
  else if (pc === 'sport') checked.push('purpose_sport')
  else if (pc === 'medical') checked.push('purpose_medical')
  else if (pc === 'study') checked.push('purpose_study')
  else if (pc === 'pension') checked.push('purpose_pension')
  else checked.push('purpose_other')

  checked.push(
    form.visitedBulgariaBefore === 'yes' ? 'visited_yes' : 'visited_no',
    form.thirdCountryResidence === 'yes' ? 'third_yes' : 'third_no',
    form.liveOutsideBulgaria === 'yes' ? 'outside_yes' : 'outside_no',
    form.familyTraveling === 'yes' ? 'family_yes' : 'family_no',
    form.previousVisaRefused === 'yes' ? 'refused_yes' : 'refused_no',
    form.hasCriminalRecord === 'yes' ? 'criminal_yes' : 'criminal_no',
    form.wasDeported === 'yes' ? 'deported_yes' : 'deported_no',
    form.hasInfectiousDisease === 'yes' ? 'disease_yes' : 'disease_no',
  )

  if (form.financialMeans === 'self') {
    checked.push('fin_self')
    const types = form.financialMeansType || []
    if (types.includes('cash')) checked.push('fin_cash')
    if (types.includes('travcheck')) checked.push('fin_travcheck')
    if (types.includes('card')) checked.push('fin_card')
    if (types.includes('accom')) checked.push('fin_accom')
    if (types.includes('transport')) checked.push('fin_transport')
  } else if (form.financialMeans === 'sponsor') {
    checked.push('fin_sponsor')
  } else if (form.financialMeans === 'employer') {
    checked.push('fin_employer')
  }

  return checked
}

export async function fillVisaForm(
  form: VisaFormData,
  overrides: VisaPdfOverrides = {},
): Promise<void> {
  const response = await fetch('/visa_d_blank.pdf')
  if (!response.ok) throw new Error(
    'Не удалось загрузить бланк. Убедитесь что public/visa_d_blank.pdf существует.'
  )
  const pdfBytes = await response.arrayBuffer()
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const { font } = await embedCyrillicFonts(pdfDoc)
  const pages = pdfDoc.getPages()
  const INK = rgb(0, 0, 0.55) // dark blue — typed text appearance
  const SZ = 8.5
  const values = buildVisaFieldValues(form)
  const textOverrides = overrides.text ?? {}
  const offsetOverrides = overrides.offsets ?? {}
  const hasTextOverride = (key: VisaFieldKey) =>
    Object.prototype.hasOwnProperty.call(textOverrides, key)

  // Draw text at field position, auto-shrinking font to fit maxWidth
  const put = (key: VisaFieldKey) => {
    const value = hasTextOverride(key) ? textOverrides[key] ?? '' : values[key] ?? ''
    if (!value.trim()) return
    const c = FIELDS[key]
    const [x, y, maxW, pg] = c
    const page = pages[pg]
    if (!page) return
    const offset = offsetOverrides[key]
    const fitted = fitTextToWidth(value.trim(), font, SZ, maxW)
    page.drawText(fitted.text, {
      x: x + (offset?.dx ?? 0),
      y: y - (offset?.dy ?? 0),
      size: fitted.fontSize,
      font,
      color: INK,
    })
  }

  // Mark checkbox with X
  const check = (key: VisaCheckboxKey) => {
    const c = CHECKBOXES[key]
    const [x, y, pg] = c
    pages[pg]?.drawText('X', {
      x: x + 1, y: y + 1,
      size: 7, font,
      color: rgb(0, 0, 0),
    })
  }

  for (const key of Object.keys(values) as VisaFieldKey[]) {
    put(key)
  }
  for (const key of buildVisaCheckedBoxes(form)) {
    check(key)
  }

  // ── Download ──────────────────────────────────────────────
  const filled = await pdfDoc.save()
  const blob = new Blob([filled as unknown as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `VisaD_${form.lastName || 'заявление'}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Test data — realistic startup visa applicant ──────────
export const TEST_FORM_DATA: VisaFormData = {
  lastName:              'IVANOV',
  formerLastName:        '',
  firstName:             'IVAN NIKOLAEVICH',
  birthDate:             '1988-05-15',
  birthPlace:            'Москва',
  birthCountry:          'Россия',
  nationality:           'Российская Федерация',
  nationalityAtBirth:    '',
  otherNationality:      '',
  previousNationalities: '',
  gender:                'M',
  homeAddress:           'Россия, 123456, Москва, ул. Тверская, д.1, кв.10',
  phone:                 '+7 916 123 45 67',
  email:                 'ivan.ivanov@example.com',
  passportType:          'Общегражданский паспорт',
  passportNumber:        '71 1234567',
  passportIssueDate:     '2020-03-10',
  passportExpiry:        '2030-03-10',
  passportIssuedBy:      'ГУ МВД России по г. Москве',
  nationalId:            '',
  maritalStatus:         'Женат/Замужем',
  spouse: {
    lastName:          'IVANOVA',
    formerLastName:    'PETROVA',
    firstName:         'MARIA ALEKSEEVNA',
    birthDate:         '1990-08-22',
    nationality:       'Российская Федерация',
    formerNationality: '',
    address:           'Россия, Москва, ул. Тверская, д.1, кв.10',
  },
  children: [
    {
      lastName:    'IVANOV',
      firstName:   'ALEKSEI',
      birthDate:   '2015-11-03',
      birthPlace:  'Москва',
      nationality: 'Российская Федерация',
      address:     'Россия, Москва, ул. Тверская, д.1, кв.10',
    },
  ],
  purposeCategory:         'other',
  purpose:                 'StartUp Visa / Инновационный IT-бизнес',
  arrivalDate:             '2026-06-01',
  visitedBulgariaBefore:   'no',
  bulgariaVisits: [
    { dateFrom: '', dateTo: '', place: '' },
    { dateFrom: '', dateTo: '', place: '' },
    { dateFrom: '', dateTo: '', place: '' },
  ],
  thirdCountryResidence:   'no',
  thirdCountryPermitNum:   '',
  thirdCountryPermitExpiry:'',
  thirdCountryStayFrom:    '',
  thirdCountryStayTo:      '',
  dateFrom:                '2026-06-01',
  dateTo:                  '2026-11-30',
  bulgAddressCity:         'София',
  bulgAddressStreet:       'ул. Витоша 15, ет.3',
  liveOutsideBulgaria:     'no',
  familyTraveling:         'yes',
  familyTravelingDetails:  'Супруга Иванова М.А., сын Иванов А.И.',
  occupation:              'Founder / IT-предприниматель',
  employer:                'TechStart EOOD',
  employerAddress:         'Sofia, ul. Vitosha 15',
  otherPurposeInfo:        'Развитие инновационного SaaS-проекта в сфере fintech. Сертификат МИР №2026-XXX.',
  previousVisaRefused:     'no',
  previousVisaRefusedDetails: '',
  hasCriminalRecord:       'no',
  criminalRecordDetails:   '',
  wasDeported:             'no',
  deportedDetails:         '',
  hasInfectiousDisease:    'no',
  financialMeans:          'self',
  financialMeansType:      ['cash', 'card'],
}
