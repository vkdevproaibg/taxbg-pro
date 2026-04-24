import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import {
  buildVisaFieldValues,
  FIELDS,
  VISA_PAGE_SIZE,
} from '../../lib/visaFormFiller'
import type {
  VisaFieldKey,
  VisaFormData,
  VisaPdfOverrides,
} from '../../lib/visaFormFiller'

interface Props {
  form: VisaFormData
  overrides: VisaPdfOverrides
  setOverrides: Dispatch<SetStateAction<VisaPdfOverrides>>
}

const PAGE_IMAGE_COUNT = 4
const FONT_SIZE = 8.5
const FONT_HEIGHT = 11.577
const FIELD_MIN_HEIGHT = 14

const FIELD_TITLES: Partial<Record<VisaFieldKey, string>> = {
  f1_surname: '1. Фамилия',
  f2_formerSurname: '2. Прежняя фамилия',
  f3_firstName: '3. Имя',
  f4_birthDate: '4. Дата рождения',
  f5_birthPlace: '5. Место рождения',
  f6_birthCountry: '6. Страна рождения',
  f7_nationality: '7. Гражданство',
  f10_address: '10. Адрес',
  f12_passportNum: '12. Номер паспорта',
  f21_purposeOther: '21. Иная цель',
  f26_address: '26. Адрес в Болгарии',
  f31_other: '31. Доп. информация',
}

function getFieldTitle(key: VisaFieldKey) {
  return FIELD_TITLES[key] || key
}

function getDisplayValue(
  key: VisaFieldKey,
  baseValues: Partial<Record<VisaFieldKey, string>>,
  overrides: VisaPdfOverrides,
) {
  if (Object.prototype.hasOwnProperty.call(overrides.text ?? {}, key)) {
    return overrides.text?.[key] ?? ''
  }
  return baseValues[key] ?? ''
}

function getFieldStyle(key: VisaFieldKey, overrides: VisaPdfOverrides, selected: boolean) {
  const [x, y, width] = FIELDS[key]
  const dx = overrides.offsets?.[key]?.dx ?? 0
  const dy = overrides.offsets?.[key]?.dy ?? 0

  return {
    position: 'absolute',
    left: `${x + dx}px`,
    top: `${VISA_PAGE_SIZE.height - y - FONT_HEIGHT + dy}px`,
    width: `${width}px`,
    minHeight: `${FIELD_MIN_HEIGHT}px`,
    padding: '0 1px',
    borderRadius: '4px',
    border: selected
      ? '1px solid rgba(0, 150, 110, 0.9)'
      : '1px dashed rgba(0, 150, 110, 0.28)',
    backgroundColor: selected ? 'rgba(230, 244, 240, 0.7)' : 'rgba(255, 255, 255, 0.12)',
    color: 'rgb(20, 34, 153)',
    fontFamily: '"Noto Sans Visa", "Noto Sans", sans-serif',
    fontSize: `${FONT_SIZE}px`,
    lineHeight: `${FONT_HEIGHT}px`,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    outline: 'none',
    boxSizing: 'border-box',
  } as const
}

export default function VisaPdfCorrectionPreview({
  form,
  overrides,
  setOverrides,
}: Props) {
  const baseValues = buildVisaFieldValues(form)
  const [selectedField, setSelectedField] = useState<VisaFieldKey | null>(null)

  const setTextOverride = (key: VisaFieldKey, rawValue: string) => {
    const nextValue = rawValue.replace(/\n/g, ' ')
    const baseValue = baseValues[key] ?? ''

    setOverrides(prev => {
      const nextText = { ...(prev.text ?? {}) }
      if (nextValue === baseValue) delete nextText[key]
      else nextText[key] = nextValue

      return {
        ...prev,
        text: Object.keys(nextText).length > 0 ? nextText : undefined,
      }
    })
  }

  const nudgeSelected = (dx: number, dy: number) => {
    if (!selectedField) return

    setOverrides(prev => {
      const current = prev.offsets?.[selectedField] ?? { dx: 0, dy: 0 }
      const nextOffsets = {
        ...(prev.offsets ?? {}),
        [selectedField]: {
          dx: current.dx + dx,
          dy: current.dy + dy,
        },
      }
      return { ...prev, offsets: nextOffsets }
    })
  }

  const resetSelected = () => {
    if (!selectedField) return

    setOverrides(prev => {
      const nextText = { ...(prev.text ?? {}) }
      const nextOffsets = { ...(prev.offsets ?? {}) }
      delete nextText[selectedField]
      delete nextOffsets[selectedField]

      return {
        text: Object.keys(nextText).length > 0 ? nextText : undefined,
        offsets: Object.keys(nextOffsets).length > 0 ? nextOffsets : undefined,
      }
    })
  }

  const resetAll = () => setOverrides({})

  const selectedOffset = selectedField
    ? overrides.offsets?.[selectedField] ?? { dx: 0, dy: 0 }
    : { dx: 0, dy: 0 }

  const fieldKeys = Object.keys(FIELDS) as VisaFieldKey[]

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl p-4 space-y-3"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => nudgeSelected(-1, 0)}
            disabled={!selectedField}
            className="rounded-lg px-3 py-2 text-xs font-medium"
            style={{
              border: '1px solid var(--border)',
              backgroundColor: 'white',
              color: 'var(--text-primary)',
            }}
          >
            ← Влево
          </button>
          <button
            onClick={() => nudgeSelected(1, 0)}
            disabled={!selectedField}
            className="rounded-lg px-3 py-2 text-xs font-medium"
            style={{
              border: '1px solid var(--border)',
              backgroundColor: 'white',
              color: 'var(--text-primary)',
            }}
          >
            Вправо →
          </button>
          <button
            onClick={() => nudgeSelected(0, -1)}
            disabled={!selectedField}
            className="rounded-lg px-3 py-2 text-xs font-medium"
            style={{
              border: '1px solid var(--border)',
              backgroundColor: 'white',
              color: 'var(--text-primary)',
            }}
          >
            ↑ Выше
          </button>
          <button
            onClick={() => nudgeSelected(0, 1)}
            disabled={!selectedField}
            className="rounded-lg px-3 py-2 text-xs font-medium"
            style={{
              border: '1px solid var(--border)',
              backgroundColor: 'white',
              color: 'var(--text-primary)',
            }}
          >
            Ниже ↓
          </button>
          <button
            onClick={resetSelected}
            disabled={!selectedField}
            className="rounded-lg px-3 py-2 text-xs font-medium"
            style={{
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
            }}
          >
            Сбросить поле
          </button>
          <button
            onClick={resetAll}
            className="rounded-lg px-3 py-2 text-xs font-medium"
            style={{
              border: '1px solid var(--danger)',
              backgroundColor: 'var(--danger-light)',
              color: 'var(--danger-text)',
            }}
          >
            Сбросить все правки
          </button>
        </div>

        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Выберите поле на бланке, при необходимости поправьте сам текст прямо поверх страницы,
          затем подвигайте его кнопками до точного совпадения. Эти правки применяются при
          скачивании PDF.
        </p>

        {selectedField && (
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Выбрано: {getFieldTitle(selectedField)} · dx {selectedOffset.dx} · dy {selectedOffset.dy}
          </p>
        )}
      </div>

      <div className="space-y-5 overflow-x-auto pb-2">
        {Array.from({ length: PAGE_IMAGE_COUNT }, (_, pageIndex) => (
          <div key={pageIndex} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Страница {pageIndex + 1}
            </p>
            <div
              className="relative overflow-hidden rounded-xl"
              style={{
                width: `${VISA_PAGE_SIZE.width}px`,
                height: `${VISA_PAGE_SIZE.height}px`,
                border: '1px solid var(--border-strong)',
                boxShadow: 'var(--shadow-soft)',
                backgroundColor: 'white',
              }}
            >
              <img
                src={`/visa-d-preview/page-${pageIndex + 1}.png`}
                alt={`Visa D page ${pageIndex + 1}`}
                draggable={false}
                style={{
                  width: `${VISA_PAGE_SIZE.width}px`,
                  height: `${VISA_PAGE_SIZE.height}px`,
                  display: 'block',
                  userSelect: 'none',
                }}
              />

              {fieldKeys
                .filter(key => FIELDS[key][3] === pageIndex)
                .map(key => (
                  <div
                    key={key}
                    contentEditable
                    suppressContentEditableWarning
                    spellCheck={false}
                    tabIndex={0}
                    onFocus={() => setSelectedField(key)}
                    onInput={e => setTextOverride(key, e.currentTarget.textContent ?? '')}
                    onKeyDown={e => {
                      if (e.key === 'Enter') e.preventDefault()
                    }}
                    style={getFieldStyle(key, overrides, selectedField === key)}
                  >
                    {getDisplayValue(key, baseValues, overrides)}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
