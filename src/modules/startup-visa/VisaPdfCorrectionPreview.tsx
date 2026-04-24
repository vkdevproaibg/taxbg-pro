import { useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import {
  buildVisaFieldValues,
  DEFAULT_VISA_FONT_SIZE,
  FIELDS,
  getVisaFieldFontSize,
  normalizeVisaFontSize,
  VISA_FONT_SIZE_STEP,
  MAX_VISA_FONT_SIZE,
  MIN_VISA_FONT_SIZE,
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

type InteractionMode = 'move' | 'edit'

interface DragState {
  key: VisaFieldKey
  pointerId: number
  startX: number
  startY: number
  startDx: number
  startDy: number
}

const PAGE_IMAGE_COUNT = 4
const FONT_SIZE = DEFAULT_VISA_FONT_SIZE
const FONT_HEIGHT = 11.577
const LINE_HEIGHT_RATIO = FONT_HEIGHT / FONT_SIZE
const FIELD_MIN_HEIGHT = 14

const ROW_ALIGNMENT_GROUPS: VisaFieldKey[][] = [
  ['f4_birthDate', 'f5_birthPlace', 'f6_birthCountry'],
  ['f7_nationality', 'f7_natAtBirth', 'f7_otherNat'],
  ['f12_passportNum', 'f13_issueDate', 'f14_expiry', 'f15_issuedBy'],
  ['f18_spouseLastName', 'f18_spouseFormerName'],
  ['f18_spouseFirstName', 'f18_spouseBirth'],
  ['f18_spouseNat', 'f18_spouseFormerNat'],
  ['f19_child1_name', 'f19_child1_firstName', 'f19_child1_birth', 'f19_child1_nat', 'f19_child1_addr'],
  ['f19_child2_name', 'f19_child2_firstName', 'f19_child2_birth', 'f19_child2_nat', 'f19_child2_addr'],
  ['f23_visit1_from', 'f23_visit1_to', 'f23_visit1_place'],
  ['f23_visit2_from', 'f23_visit2_to', 'f23_visit2_place'],
  ['f23_visit3_from', 'f23_visit3_to', 'f23_visit3_place'],
  ['f24_permitNum', 'f24_permitExpiry', 'f24_stayFrom'],
  ['f25_from', 'f25_to'],
]

const COLUMN_ALIGNMENT_GROUPS: VisaFieldKey[][] = [
  ['f1_surname', 'f2_formerSurname', 'f3_firstName'],
  ['f10_email', 'f10_phone'],
  ['f18_spouseLastName', 'f18_spouseFirstName', 'f18_spouseNat'],
  ['f18_spouseFormerName', 'f18_spouseBirth', 'f18_spouseFormerNat'],
  ['f19_child1_name', 'f19_child2_name'],
  ['f19_child1_firstName', 'f19_child2_firstName'],
  ['f19_child1_birth', 'f19_child2_birth'],
  ['f19_child1_nat', 'f19_child2_nat'],
  ['f19_child1_addr', 'f19_child2_addr'],
  ['f23_visit1_from', 'f23_visit2_from', 'f23_visit3_from'],
  ['f23_visit1_to', 'f23_visit2_to', 'f23_visit3_to'],
  ['f23_visit1_place', 'f23_visit2_place', 'f23_visit3_place'],
]

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

function buildAlignmentLookup(groups: VisaFieldKey[][]) {
  const lookup: Partial<Record<VisaFieldKey, VisaFieldKey[]>> = {}
  for (const group of groups) {
    for (const key of group) lookup[key] = group
  }
  return lookup
}

const ROW_ALIGNMENT_LOOKUP = buildAlignmentLookup(ROW_ALIGNMENT_GROUPS)
const COLUMN_ALIGNMENT_LOOKUP = buildAlignmentLookup(COLUMN_ALIGNMENT_GROUPS)

function getFieldStyle(
  key: VisaFieldKey,
  overrides: VisaPdfOverrides,
  selected: boolean,
  mode: InteractionMode,
  dragging: boolean,
) {
  const [x, y, width] = FIELDS[key]
  const dx = overrides.offsets?.[key]?.dx ?? 0
  const dy = overrides.offsets?.[key]?.dy ?? 0
  const fontSize = getVisaFieldFontSize(key, overrides)
  const lineHeight = fontSize * LINE_HEIGHT_RATIO

  return {
    position: 'absolute',
    left: `${x + dx}px`,
    top: `${VISA_PAGE_SIZE.height - y - lineHeight + dy}px`,
    width: `${width}px`,
    minHeight: `${Math.max(FIELD_MIN_HEIGHT, lineHeight + 2)}px`,
    padding: '0 1px',
    borderRadius: '4px',
    border: selected
      ? '1px solid rgba(0, 150, 110, 0.9)'
      : '1px dashed rgba(0, 150, 110, 0.28)',
    backgroundColor: selected ? 'rgba(230, 244, 240, 0.7)' : 'rgba(255, 255, 255, 0.12)',
    color: 'rgb(20, 34, 153)',
    fontFamily: '"Noto Sans Visa", "Noto Sans", sans-serif',
    fontSize: `${fontSize}px`,
    lineHeight: `${lineHeight}px`,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    outline: 'none',
    boxSizing: 'border-box',
    zIndex: selected ? 2 : 1,
    cursor: mode === 'move' ? (dragging ? 'grabbing' : 'grab') : 'text',
    userSelect: mode === 'move' ? 'none' : 'text',
    touchAction: mode === 'move' ? 'none' : 'auto',
  } as const
}

export default function VisaPdfCorrectionPreview({
  form,
  overrides,
  setOverrides,
}: Props) {
  const baseValues = buildVisaFieldValues(form)
  const [selectedField, setSelectedField] = useState<VisaFieldKey | null>(null)
  const [mode, setMode] = useState<InteractionMode>('move')
  const [draggingField, setDraggingField] = useState<VisaFieldKey | null>(null)
  const dragRef = useRef<DragState | null>(null)

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

  const setFieldOffset = (key: VisaFieldKey, dx: number, dy: number) => {
    setOverrides(prev => {
      const nextOffsets = { ...(prev.offsets ?? {}) }
      if (dx === 0 && dy === 0) delete nextOffsets[key]
      else nextOffsets[key] = { dx, dy }

      return {
        ...prev,
        offsets: Object.keys(nextOffsets).length > 0 ? nextOffsets : undefined,
      }
    })
  }

  const setFieldFontSize = (key: VisaFieldKey, nextSize: number) => {
    const normalized = normalizeVisaFontSize(nextSize)

    setOverrides(prev => {
      const nextFontSizes = { ...(prev.fontSizes ?? {}) }
      if (normalized === DEFAULT_VISA_FONT_SIZE) delete nextFontSizes[key]
      else nextFontSizes[key] = normalized

      return {
        ...prev,
        fontSizes: Object.keys(nextFontSizes).length > 0 ? nextFontSizes : undefined,
      }
    })
  }

  const changeSelectedFontSize = (delta: number) => {
    if (!selectedField) return
    setFieldFontSize(
      selectedField,
      getVisaFieldFontSize(selectedField, overrides) + delta,
    )
  }

  const getAlignedFieldKeys = (axis: 'row' | 'column', key: VisaFieldKey) => {
    const manualGroup = axis === 'row'
      ? ROW_ALIGNMENT_LOOKUP[key]
      : COLUMN_ALIGNMENT_LOOKUP[key]

    if (manualGroup) return manualGroup

    const [refX, refY, , refPage] = FIELDS[key]
    return fieldKeys.filter(candidate => {
      const [x, y, , page] = FIELDS[candidate]
      if (page !== refPage) return false
      return axis === 'row' ? y === refY : x === refX
    })
  }

  const alignSelectedRow = () => {
    if (!selectedField) return
    const targetBaseline = FIELDS[selectedField][1] - (overrides.offsets?.[selectedField]?.dy ?? 0)
    const keys = getAlignedFieldKeys('row', selectedField)

    setOverrides(prev => {
      const nextOffsets = { ...(prev.offsets ?? {}) }

      for (const key of keys) {
        const [, y] = FIELDS[key]
        const current = nextOffsets[key] ?? { dx: 0, dy: 0 }
        const nextDy = Math.round(y - targetBaseline)
        if (current.dx === 0 && nextDy === 0) delete nextOffsets[key]
        else nextOffsets[key] = { dx: current.dx, dy: nextDy }
      }

      return {
        ...prev,
        offsets: Object.keys(nextOffsets).length > 0 ? nextOffsets : undefined,
      }
    })
  }

  const alignSelectedColumn = () => {
    if (!selectedField) return
    const targetX = FIELDS[selectedField][0] + (overrides.offsets?.[selectedField]?.dx ?? 0)
    const keys = getAlignedFieldKeys('column', selectedField)

    setOverrides(prev => {
      const nextOffsets = { ...(prev.offsets ?? {}) }

      for (const key of keys) {
        const [x] = FIELDS[key]
        const current = nextOffsets[key] ?? { dx: 0, dy: 0 }
        const nextDx = Math.round(targetX - x)
        if (nextDx === 0 && current.dy === 0) delete nextOffsets[key]
        else nextOffsets[key] = { dx: nextDx, dy: current.dy }
      }

      return {
        ...prev,
        offsets: Object.keys(nextOffsets).length > 0 ? nextOffsets : undefined,
      }
    })
  }

  const beginDrag = (
    key: VisaFieldKey,
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    setSelectedField(key)
    if (mode !== 'move') return

    event.preventDefault()
    const current = overrides.offsets?.[key] ?? { dx: 0, dy: 0 }
    dragRef.current = {
      key,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startDx: current.dx,
      startDy: current.dy,
    }
    setDraggingField(key)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const dragMove = (
    key: VisaFieldKey,
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const drag = dragRef.current
    if (!drag || drag.key !== key || drag.pointerId !== event.pointerId) return

    event.preventDefault()
    setFieldOffset(
      key,
      Math.round(drag.startDx + (event.clientX - drag.startX)),
      Math.round(drag.startDy + (event.clientY - drag.startY)),
    )
  }

  const endDrag = (
    key: VisaFieldKey,
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const drag = dragRef.current
    if (!drag || drag.key !== key || drag.pointerId !== event.pointerId) return

    dragRef.current = null
    setDraggingField(null)
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  const resetSelected = () => {
    if (!selectedField) return

    setOverrides(prev => {
      const nextText = { ...(prev.text ?? {}) }
      const nextOffsets = { ...(prev.offsets ?? {}) }
      const nextFontSizes = { ...(prev.fontSizes ?? {}) }
      delete nextText[selectedField]
      delete nextOffsets[selectedField]
      delete nextFontSizes[selectedField]

      return {
        ...prev,
        text: Object.keys(nextText).length > 0 ? nextText : undefined,
        offsets: Object.keys(nextOffsets).length > 0 ? nextOffsets : undefined,
        fontSizes: Object.keys(nextFontSizes).length > 0 ? nextFontSizes : undefined,
      }
    })
  }

  const resetAll = () => setOverrides({})

  const selectedOffset = selectedField
    ? overrides.offsets?.[selectedField] ?? { dx: 0, dy: 0 }
    : { dx: 0, dy: 0 }

  const fieldKeys = Object.keys(FIELDS) as VisaFieldKey[]
  const selectedFontSize = selectedField
    ? getVisaFieldFontSize(selectedField, overrides)
    : DEFAULT_VISA_FONT_SIZE
  const selectedRowFieldCount = selectedField ? getAlignedFieldKeys('row', selectedField).length : 0
  const selectedColumnFieldCount = selectedField ? getAlignedFieldKeys('column', selectedField).length : 0

  return (
    <div className="space-y-4">
      <div
        className="overflow-hidden rounded-xl"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        <div
          className="space-y-3 border-b p-4"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex gap-2 flex-wrap items-center">
            <button
              onClick={() => setMode('move')}
              className="rounded-lg px-3 py-2 text-xs font-medium"
              style={{
                border: mode === 'move' ? '1px solid var(--accent)' : '1px solid var(--border)',
                backgroundColor: mode === 'move' ? 'var(--accent-light)' : 'white',
                color: mode === 'move' ? 'var(--accent-text)' : 'var(--text-primary)',
              }}
            >
              Перемещение мышью
            </button>
            <button
              onClick={() => setMode('edit')}
              className="rounded-lg px-3 py-2 text-xs font-medium"
              style={{
                border: mode === 'edit' ? '1px solid var(--accent)' : '1px solid var(--border)',
                backgroundColor: mode === 'edit' ? 'var(--accent-light)' : 'white',
                color: mode === 'edit' ? 'var(--accent-text)' : 'var(--text-primary)',
              }}
            >
              Редактирование текста
            </button>
            <button
              onClick={() => changeSelectedFontSize(-VISA_FONT_SIZE_STEP)}
              disabled={!selectedField || selectedFontSize <= MIN_VISA_FONT_SIZE}
              className="rounded-lg px-3 py-2 text-xs font-medium"
              style={{
                border: '1px solid var(--border)',
                backgroundColor: 'white',
                color: 'var(--text-primary)',
              }}
            >
              A−
            </button>
            <button
              onClick={() => changeSelectedFontSize(VISA_FONT_SIZE_STEP)}
              disabled={!selectedField || selectedFontSize >= MAX_VISA_FONT_SIZE}
              className="rounded-lg px-3 py-2 text-xs font-medium"
              style={{
                border: '1px solid var(--border)',
                backgroundColor: 'white',
                color: 'var(--text-primary)',
              }}
            >
              A+
            </button>
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
              onClick={alignSelectedRow}
              disabled={!selectedField || selectedRowFieldCount <= 1}
              className="rounded-lg px-3 py-2 text-xs font-medium"
              style={{
                border: '1px solid var(--border)',
                backgroundColor: 'white',
                color: 'var(--text-primary)',
              }}
            >
              Вся строка
            </button>
            <button
              onClick={alignSelectedColumn}
              disabled={!selectedField || selectedColumnFieldCount <= 1}
              className="rounded-lg px-3 py-2 text-xs font-medium"
              style={{
                border: '1px solid var(--border)',
                backgroundColor: 'white',
                color: 'var(--text-primary)',
              }}
            >
              Весь столбец
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
            В режиме перемещения поле можно схватить мышью и утащить в нужное место.
            В режиме редактирования можно поправить сам текст прямо поверх страницы.
            Все правки применяются при скачивании PDF.
          </p>

        {selectedField && (
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Режим: {mode === 'move' ? 'перемещение' : 'редактирование'} ·
            {' '}Выбрано: {getFieldTitle(selectedField)} ·
            {' '}dx {selectedOffset.dx} · dy {selectedOffset.dy} ·
            {' '}шрифт {selectedFontSize.toFixed(1)} pt ·
            {' '}строка {selectedRowFieldCount} · столбец {selectedColumnFieldCount}
          </p>
        )}
        </div>

        <div
          className="overflow-auto p-4"
          style={{
            maxHeight: '75vh',
            overscrollBehavior: 'contain',
            backgroundColor: 'var(--surface-card)',
          }}
        >
          <div className="min-w-max space-y-5 pb-2">
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
                        contentEditable={mode === 'edit'}
                        suppressContentEditableWarning
                        spellCheck={mode === 'edit'}
                        tabIndex={0}
                        onFocus={() => setSelectedField(key)}
                        onPointerDown={e => beginDrag(key, e)}
                        onPointerMove={e => dragMove(key, e)}
                        onPointerUp={e => endDrag(key, e)}
                        onPointerCancel={e => endDrag(key, e)}
                        onInput={e => setTextOverride(key, e.currentTarget.textContent ?? '')}
                        onKeyDown={e => {
                          if (e.key === 'Enter') e.preventDefault()
                        }}
                        style={getFieldStyle(
                          key,
                          overrides,
                          selectedField === key,
                          mode,
                          draggingField === key,
                        )}
                      >
                        {getDisplayValue(key, baseValues, overrides)}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
