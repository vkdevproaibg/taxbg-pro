// NAP form schema versions
// When NAP publishes updated XSD — add new entry, keep old for reference
// DDS forms:  https://nap.bg/page?id=392
// ZKPO forms: https://nap.bg/page?id=393

export interface FormSchema {
  version: string
  effectiveFrom: string
  notes: string
}

export const DDS_SCHEMA: FormSchema = {
  version: '2026-01',
  effectiveFrom: '2026-01-01',
  notes: 'Справка-декларация по ЗДДС след въвеждане на еврото. Суми в EUR.',
}

export const ZKPO_SCHEMA: FormSchema = {
  version: '2026-01',
  effectiveFrom: '2026-01-01',
  notes: 'Годишна данъчна декларация по ЗКПО за 2025 г. (подава се от 01.03 до 30.06.2026). Суми в EUR.',
}