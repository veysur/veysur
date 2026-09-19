import React from 'react'

import {
  ATTRIBUTE_MATRIX_ORIENTATION,
  MATRIX_ORIENTATION_ANSWER_OPTIONS_ROWS,
  ATTRIBUTE_CHOICE_MIN_MAX,
  MatrixResponseData,
  MatrixCellValue,
  QUESTION_TYPE_NUMBER,
  QUESTION_TYPE_DATE,
  QUESTION_TYPE_TIME,
  QUESTION_TYPE_DATETIME,
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_YES_NO,
  SurveyQuestion,
  MinMax,
} from 'veysur-common'

import { useRandomisationContext } from 'component/Survey/RandomisationContext'
import { useQuestionRandomisation } from 'component/Survey/hook/useQuestionRandomisation'

import { Checkbox } from 'component/shadcn/checkbox'
import { RadioGroup, RadioGroupItem } from 'component/shadcn/radio-group'

import {
  QuestionTypeProps,
  TOGGLE_HOVER_CLASS,
  resolveLabelText,
} from './QuestionTypeProps'
import { ToggleCell } from './ToggleCell'
import { QuestionTypeText } from './QuestionTypeText'
import { QuestionTypeNumber } from './QuestionTypeNumber'
import { QuestionTypeDate } from './QuestionTypeDate'
import { QuestionTypeTime } from './QuestionTypeTime'
import { QuestionTypeDateTime } from './QuestionTypeDateTime'
import { MultipleChoiceYesNo } from './MultipleChoice'

// Data columns (answer options or subquestions, whichever the current
// orientation places across the top) share a single equal width, sized to
// whichever column's label needs the most space, up to this cap — beyond
// which the label wraps instead of growing the column further.
const MATRIX_COLUMN_MIN_WIDTH = 44
const MATRIX_COLUMN_MAX_WIDTH = 180
const MATRIX_COLUMN_CELL_PADDING = 16 // matches the header cell's p-2 (8px each side)

// Date/time/datetime cells render an icon-button with a text label (e.g. the
// selected value formatted as "August 14th, 2026" for Date, or "August 14th,
// 2026 14:30" for DateTime). The natural-width measurement below only looks at
// column *header* text, never the button's own value, so these controls need an
// explicit floor sized to their longest realistic rendered value (icon + gap +
// button padding + text) or the value truncates even once the column is no
// longer icon-only. Widths are per-type so a lone Time column isn't forced as
// wide as a DateTime column.
const MATRIX_COLUMN_MIN_WIDTH_BY_WIDE_CONTROL_TYPE: Record<string, number> = {
  [QUESTION_TYPE_DATE]: 200,
  [QUESTION_TYPE_TIME]: 150,
  [QUESTION_TYPE_DATETIME]: 240,
}

// Keeps the row-label column fixed in view while data columns scroll horizontally.
// Translucent so it blends with whatever's behind it (plain page background or the
// admin editor's tinted focus state) instead of a hardcoded opaque color.
const MATRIX_STICKY_LABEL_CLASS = 'sticky left-0 z-10 bg-background/95'

// The header row's first cell always sits above the row-label column and is always
// empty, so it stays transparent rather than painting an opaque corner over content.
const MATRIX_STICKY_CORNER_CLASS = 'sticky left-0 z-10 bg-transparent'

type MatrixEntity = { _id: string }

// Shared table markup for both matrix orientations — the caller decides which
// entity array plays "columns" vs "rows" and how to label/render each axis.
const renderMatrixTable = <Col extends MatrixEntity, Row extends MatrixEntity>(
  measurementNode: React.ReactNode,
  columnWidth: number | undefined,
  columns: Col[],
  rows: Row[],
  getColumnLabel: (col: Col) => string,
  getRowLabel: (row: Row) => string,
  cellFor: (row: Row, col: Col) => React.ReactNode,
) => (
  <>
    {measurementNode}
    <div className="overflow-x-auto">
      <table
        className={
          columnWidth
            ? 'border-collapse text-sm table-fixed'
            : 'border-collapse text-sm'
        }
      >
        {columnWidth && (
          <colgroup>
            <col />
            {columns.map((col) => (
              <col key={col._id} style={{ width: columnWidth }} />
            ))}
          </colgroup>
        )}
        <thead>
          <tr>
            <td
              className={`text-left p-2 min-w-[80px] ${MATRIX_STICKY_CORNER_CLASS}`}
            />
            {columns.map((col) => (
              <td
                key={col._id}
                className="text-center p-2 break-normal min-w-[44px]"
              >
                {getColumnLabel(col)}
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row._id} className="border-t">
              <td
                className={`p-2 break-normal min-w-[80px] ${MATRIX_STICKY_LABEL_CLASS}`}
              >
                {getRowLabel(row)}
              </td>
              {columns.map((col) => cellFor(row, col))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
)

export const QuestionTypeMatrix: React.FC<QuestionTypeProps> = ({
  question,
  value,
  lang,
  langDefault,
  onChange,
  expressionContext,
}) => {
  const orientation =
    question?.attributes?.[ATTRIBUTE_MATRIX_ORIENTATION] ||
    MATRIX_ORIENTATION_ANSWER_OPTIONS_ROWS
  const isSubquestionsAsRows = orientation === 'b'
  const rawAnswerOptions = question?.answerOptions || []
  const rawSubquestions = question?.subquestions || []

  const { randomSeeds, onSeedRequired } = useRandomisationContext()
  const isRandomised = Boolean(question?.attributes?.choiceRandomise)
  const answerOptions = useQuestionRandomisation(
    rawAnswerOptions,
    `${question?.code}_ao`,
    isRandomised,
    randomSeeds,
    onSeedRequired,
  )
  const subquestions = useQuestionRandomisation(
    rawSubquestions,
    `${question?.code}_subq`,
    isRandomised,
    randomSeeds,
    onSeedRequired,
  )

  const currentValue: MatrixResponseData =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? value
      : {}

  const getAnswerOptionLabel = (ao: (typeof answerOptions)[number]) =>
    resolveLabelText(ao.label.getLang(lang, langDefault), expressionContext)
  const getSubquestionLabel = (sq: (typeof subquestions)[number]) =>
    resolveLabelText(sq.text.getLang(lang, langDefault), expressionContext)

  const columnLabels = isSubquestionsAsRows
    ? answerOptions.map(getAnswerOptionLabel)
    : subquestions.map(getSubquestionLabel)

  const wideControlMinWidth = subquestions.reduce(
    (max, sq) =>
      Math.max(max, MATRIX_COLUMN_MIN_WIDTH_BY_WIDE_CONTROL_TYPE[sq.type] ?? 0),
    0,
  )
  const columnMinWidth = wideControlMinWidth || MATRIX_COLUMN_MIN_WIDTH
  // The wide-control floor can legitimately exceed the normal column cap (e.g.
  // DateTime's 240 > 180) — raise the effective cap to match so the floor is
  // never clamped back down below the value it was set to guarantee.
  const columnMaxWidth = Math.max(MATRIX_COLUMN_MAX_WIDTH, columnMinWidth)

  const measureRefs = React.useRef<(HTMLSpanElement | null)[]>([])
  const [columnWidth, setColumnWidth] = React.useState<number | undefined>(
    undefined,
  )

  React.useLayoutEffect(() => {
    const naturalWidth = measureRefs.current
      .slice(0, columnLabels.length)
      .reduce((max, el) => Math.max(max, el?.scrollWidth ?? 0), 0)
    const nextWidth = Math.min(
      columnMaxWidth,
      Math.max(columnMinWidth, naturalWidth + MATRIX_COLUMN_CELL_PADDING),
    )
    setColumnWidth((prev) => (prev === nextWidth ? prev : nextWidth))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnLabels.join(' '), columnMinWidth, columnMaxWidth])

  const measurementNode = (
    <span className="sr-only">
      {columnLabels.map((label, i) => (
        <span
          key={i}
          ref={(el) => {
            measureRefs.current[i] = el
          }}
          className="inline-block text-sm whitespace-nowrap"
        >
          {label}
        </span>
      ))}
    </span>
  )

  const handleCellChange = (
    subquestionCode: string,
    answerOptionCode: string,
    cellValue: MatrixCellValue | undefined,
  ) => {
    if (!onChange) return
    const row = currentValue[subquestionCode]
      ? { ...currentValue[subquestionCode] }
      : {}
    if (cellValue === undefined || cellValue === '') {
      delete row[answerOptionCode]
    } else {
      row[answerOptionCode] = cellValue
    }
    onChange({ ...currentValue, [subquestionCode]: row })
  }

  const handleRadioChange = (
    subquestionCode: string,
    answerOptionCode: string,
  ) => {
    if (!onChange) return
    onChange({
      ...currentValue,
      [subquestionCode]: { [answerOptionCode]: true },
    })
  }

  const renderCell = (
    sq: (typeof subquestions)[number],
    ao: (typeof answerOptions)[number],
  ) => {
    const cellVal = currentValue[sq.code]?.[ao.code]
    const sqType = sq.type
    const sqAsQuestion = new SurveyQuestion({ ...sq })

    if (sqType === QUESTION_TYPE_NUMBER) {
      return (
        <td key={`${sq._id}-${ao._id}`} className="p-2">
          <QuestionTypeNumber
            question={sqAsQuestion}
            lang={lang}
            langDefault={langDefault}
            value={cellVal}
            onChange={(v) => handleCellChange(sq.code, ao.code, v)}
          />
        </td>
      )
    }

    if (sqType === QUESTION_TYPE_DATE) {
      return (
        <td key={`${sq._id}-${ao._id}`} className="p-2">
          <QuestionTypeDate
            question={sqAsQuestion}
            lang={lang}
            langDefault={langDefault}
            value={cellVal}
            onChange={(v) => handleCellChange(sq.code, ao.code, v)}
          />
        </td>
      )
    }

    if (sqType === QUESTION_TYPE_TIME) {
      return (
        <td key={`${sq._id}-${ao._id}`} className="p-2">
          <QuestionTypeTime
            question={sqAsQuestion}
            lang={lang}
            langDefault={langDefault}
            value={cellVal}
            onChange={(v) => handleCellChange(sq.code, ao.code, v)}
          />
        </td>
      )
    }

    if (sqType === QUESTION_TYPE_DATETIME) {
      return (
        <td key={`${sq._id}-${ao._id}`} className="p-2">
          <QuestionTypeDateTime
            question={sqAsQuestion}
            lang={lang}
            langDefault={langDefault}
            value={cellVal}
            onChange={(v) => handleCellChange(sq.code, ao.code, v)}
          />
        </td>
      )
    }

    if (sqType === QUESTION_TYPE_CHECKBOX) {
      const maxAllowed =
        (
          sq.attributes?.[ATTRIBUTE_CHOICE_MIN_MAX] as
            Partial<MinMax> | undefined
        )?.max ?? 0
      const isRadio = maxAllowed === 1
      return (
        <td key={`${sq._id}-${ao._id}`} className="p-2 text-center">
          {isRadio ? (
            <RadioGroup
              value={cellVal === true ? ao.code : ''}
              onValueChange={(val) => {
                if (val) handleRadioChange(sq.code, ao.code)
              }}
              className="flex justify-center"
            >
              <RadioGroupItem
                value={ao.code}
                id={`matrix-radio-${sq._id}-${ao._id}`}
                className={TOGGLE_HOVER_CLASS}
              />
            </RadioGroup>
          ) : (
            <ToggleCell>
              <Checkbox
                id={`matrix-checkbox-${sq._id}-${ao._id}`}
                checked={cellVal === true}
                onCheckedChange={(checked) =>
                  handleCellChange(sq.code, ao.code, checked ? true : undefined)
                }
                className={TOGGLE_HOVER_CLASS}
              />
            </ToggleCell>
          )}
        </td>
      )
    }

    if (sqType === QUESTION_TYPE_YES_NO) {
      return (
        <td key={`${sq._id}-${ao._id}`} className="p-2">
          <MultipleChoiceYesNo
            question={sqAsQuestion}
            lang={lang}
            langDefault={langDefault}
            value={cellVal}
            onChange={(v) => handleCellChange(sq.code, ao.code, v)}
          />
        </td>
      )
    }

    // QUESTION_TYPE_TEXT (default)
    return (
      <td key={`${sq._id}-${ao._id}`} className="p-2">
        <QuestionTypeText
          question={sqAsQuestion}
          lang={lang}
          langDefault={langDefault}
          value={cellVal}
          onChange={(v) => handleCellChange(sq.code, ao.code, v || undefined)}
        />
      </td>
    )
  }

  if (isSubquestionsAsRows) {
    // orientation === 'b': subquestions = rows, answerOptions = columns
    return renderMatrixTable(
      measurementNode,
      columnWidth,
      answerOptions,
      subquestions,
      getAnswerOptionLabel,
      getSubquestionLabel,
      (sq, ao) => renderCell(sq, ao),
    )
  }

  // orientation === 'a': answerOptions = rows, subquestions = columns
  return renderMatrixTable(
    measurementNode,
    columnWidth,
    subquestions,
    answerOptions,
    getSubquestionLabel,
    getAnswerOptionLabel,
    (ao, sq) => renderCell(sq, ao),
  )
}
