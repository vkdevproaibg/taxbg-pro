import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

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
const FIELDS: Record<string, [number, number, number, number]> = {
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
}

// Checkbox positions [x, y_from_bottom, pageIndex]
const CHECKBOXES: Record<string, [number, number, number]> = {
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
}

export async function fillVisaForm(form: VisaFormData): Promise<void> {
  const response = await fetch('/visa_d_blank.pdf')
  if (!response.ok) throw new Error(
    'Не удалось загрузить бланк. Убедитесь что public/visa_d_blank.pdf существует.'
  )
  const pdfBytes = await response.arrayBuffer()
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()
  const INK = rgb(0, 0, 0.55) // dark blue — typed text appearance
  const SZ = 8.5

  // Draw text at field position, truncating to fit maxWidth
  const put = (key: string, value: string) => {
    if (!value?.trim()) return
    const c = FIELDS[key]
    if (!c) return
    const [x, y, maxW, pg] = c
    const page = pages[pg]
    if (!page) return
    let text = value.trim()
    while (text.length > 1 &&
           font.widthOfTextAtSize(text, SZ) > maxW) {
      text = text.slice(0, -1)
    }
    page.drawText(text, { x, y, size: SZ, font, color: INK })
  }

  // Mark checkbox with X
  const check = (key: string) => {
    const c = CHECKBOXES[key]
    if (!c) return
    const [x, y, pg] = c
    pages[pg]?.drawText('X', {
      x: x + 1, y: y + 1,
      size: 7, font,
      color: rgb(0, 0, 0),
    })
  }

  // ── PAGE 1 ────────────────────────────────────────────────
  put('f1_surname',       form.lastName)
  put('f2_formerSurname', form.formerLastName)
  put('f3_firstName',     form.firstName)
  put('f4_birthDate',     form.birthDate)
  put('f5_birthPlace',    form.birthPlace)
  put('f6_birthCountry',  form.birthCountry)
  put('f7_nationality',   form.nationality)
  put('f7_natAtBirth',    form.nationalityAtBirth)
  put('f7_otherNat',      form.otherNationality)
  put('f8_prevNat',       form.previousNationalities)
  put('f10_address',      form.homeAddress)
  put('f10_email',        form.email)
  put('f10_phone',        form.phone)

  // Field 9 gender
  if (form.gender === 'M') check('gender_M')
  if (form.gender === 'F') check('gender_F')

  // Field 11 passport type
  const pt = form.passportType
  if      (pt.includes('Общегражд')) check('passport_civil')
  else if (pt.includes('Диплом'))    check('passport_diplo')
  else if (pt.includes('Служеб'))    check('passport_service')
  else                               check('passport_other')

  put('f12_passportNum', form.passportNumber)
  put('f13_issueDate',   form.passportIssueDate)
  put('f14_expiry',      form.passportExpiry)
  put('f15_issuedBy',    form.passportIssuedBy)

  // ── PAGE 2 ────────────────────────────────────────────────
  put('f16_nationalId', form.nationalId)

  // Field 17 marital status
  const ms = form.maritalStatus
  if      (ms.includes('Холост'))        check('marital_single')
  else if (ms.includes('Женат'))         check('marital_married')
  else if (ms.includes('партнёр'))       check('marital_partner')
  else if (ms.includes('отдельно'))      check('marital_sep')
  else if (ms.includes('Разведён'))      check('marital_div')
  else if (ms.includes('Вдов'))          check('marital_widow')

  // Field 18 spouse
  const sp = form.spouse
  put('f18_spouseLastName',   sp.lastName)
  put('f18_spouseFormerName', sp.formerLastName)
  put('f18_spouseFirstName',  sp.firstName)
  put('f18_spouseBirth',      sp.birthDate)
  put('f18_spouseNat',        sp.nationality)
  put('f18_spouseFormerNat',  sp.formerNationality)
  put('f18_spouseAddress',    sp.address)

  // Field 19 children (up to 2 rows on the form)
  const kids = form.children
  if (kids[0]) {
    put('f19_child1_name',      kids[0].lastName)
    put('f19_child1_firstName', kids[0].firstName)
    put('f19_child1_birth',
        [kids[0].birthDate, kids[0].birthPlace].filter(Boolean).join(' / '))
    put('f19_child1_nat',  kids[0].nationality)
    put('f19_child1_addr', kids[0].address)
  }
  if (kids[1]) {
    put('f19_child2_name',      kids[1].lastName)
    put('f19_child2_firstName', kids[1].firstName)
    put('f19_child2_birth',
        [kids[1].birthDate, kids[1].birthPlace].filter(Boolean).join(' / '))
    put('f19_child2_nat',  kids[1].nationality)
    put('f19_child2_addr', kids[1].address)
  }

  // Field 21 purpose checkboxes
  const pc = form.purposeCategory
  if      (pc === 'work')    check('purpose_work')
  else if (pc === 'family')  check('purpose_family')
  else if (pc === 'culture') check('purpose_culture')
  else if (pc === 'sport')   check('purpose_sport')
  else if (pc === 'medical') check('purpose_medical')
  else if (pc === 'study')   check('purpose_study')
  else if (pc === 'pension') check('purpose_pension')
  else { check('purpose_other'); put('f21_purposeOther', form.purpose) }

  put('f22_arrival', form.arrivalDate || form.dateFrom)

  // ── PAGE 3 ────────────────────────────────────────────────
  // Field 23 visited Bulgaria before
  if (form.visitedBulgariaBefore === 'yes') {
    check('visited_yes')
    form.bulgariaVisits.forEach((v, i) => {
      put(`f23_visit${i + 1}_from`,  v.dateFrom)
      put(`f23_visit${i + 1}_to`,    v.dateTo)
      put(`f23_visit${i + 1}_place`, v.place)
    })
  } else {
    check('visited_no')
  }

  // Field 24 third country residence
  if (form.thirdCountryResidence === 'yes') {
    check('third_yes')
    put('f24_permitNum',    form.thirdCountryPermitNum)
    put('f24_permitExpiry', form.thirdCountryPermitExpiry)
    put('f24_stayFrom',     form.thirdCountryStayFrom)
    put('f24_stayTo',       form.thirdCountryStayTo)
  } else {
    check('third_no')
  }

  // Fields 25-26
  put('f25_from',    form.dateFrom)
  put('f25_to',      form.dateTo)
  put('f26_address',
      [form.bulgAddressCity, form.bulgAddressStreet].filter(Boolean).join(', '))

  // Field 27
  if (form.liveOutsideBulgaria === 'yes') {
    check('outside_yes')
    put('f27_details', form.liveOutsideBulgaria)
  } else {
    check('outside_no')
  }

  // Field 28
  if (form.familyTraveling === 'yes') {
    check('family_yes')
    put('f28_details', form.familyTravelingDetails)
  } else {
    check('family_no')
  }

  // Fields 29-31
  put('f29_profession', form.occupation)
  put('f30_employer',
      [form.employer, form.employerAddress].filter(Boolean).join(', '))
  put('f31_other', form.otherPurposeInfo)

  // Field 32
  if (form.previousVisaRefused === 'yes') {
    check('refused_yes')
    put('f32_details', form.previousVisaRefusedDetails)
  } else {
    check('refused_no')
  }

  // Field 33
  if (form.hasCriminalRecord === 'yes') {
    check('criminal_yes')
    put('f33_details', form.criminalRecordDetails)
  } else {
    check('criminal_no')
  }

  // ── PAGE 4 ────────────────────────────────────────────────
  // Field 34
  if (form.wasDeported === 'yes') {
    check('deported_yes')
    put('f34_details', form.deportedDetails)
  } else {
    check('deported_no')
  }

  // Field 35
  if (form.hasInfectiousDisease === 'yes') check('disease_yes')
  else check('disease_no')

  // Field 36 financial means
  const fin = form.financialMeans
  if (fin === 'self') {
    check('fin_self')
    const types = form.financialMeansType || []
    if (types.includes('cash'))      check('fin_cash')
    if (types.includes('travcheck')) check('fin_travcheck')
    if (types.includes('card'))      check('fin_card')
    if (types.includes('accom'))     check('fin_accom')
    if (types.includes('transport')) check('fin_transport')
  } else if (fin === 'sponsor') {
    check('fin_sponsor')
  } else if (fin === 'employer') {
    check('fin_employer')
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
