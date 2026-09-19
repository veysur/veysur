import { render, screen, within, fireEvent } from '@testing-library/react'
import {
  SurveyQuestion,
  ATTRIBUTE_MATRIX_ORIENTATION,
  MATRIX_ORIENTATION_ANSWER_OPTIONS_ROWS,
  MATRIX_ORIENTATION_SUBQUESTIONS_ROWS,
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_DATE,
  QUESTION_TYPE_TIME,
  QUESTION_TYPE_DATETIME,
} from 'veysur-common'

import { QuestionTypeMatrix } from './QuestionTypeMatrix'

const MATRIX_STICKY_LABEL_CLASSES = ['sticky', 'left-0', 'z-10']

function buildQuestion(orientation: string): SurveyQuestion {
  return {
    _id: 'q1',
    code: 'Q1',
    answerOptions: [
      { _id: 'ao1', code: 'AO1', label: { getLang: () => 'Very Satisfied' } },
      { _id: 'ao2', code: 'AO2', label: { getLang: () => 'Dissatisfied' } },
    ],
    subquestions: [
      {
        _id: 'sq1',
        code: 'SQ1',
        text: { getLang: () => 'Food' },
        type: QUESTION_TYPE_CHECKBOX,
        attributes: {},
      },
      {
        _id: 'sq2',
        code: 'SQ2',
        text: { getLang: () => 'Staff' },
        type: QUESTION_TYPE_CHECKBOX,
        attributes: {},
      },
    ],
    attributes: {
      [ATTRIBUTE_MATRIX_ORIENTATION]: orientation,
    },
  } as unknown as SurveyQuestion
}

describe('QuestionTypeMatrix', () => {
  describe('orientation: answer options as rows', () => {
    it('renders answer options as row labels and subquestions as column headers', () => {
      render(
        <QuestionTypeMatrix
          question={buildQuestion(MATRIX_ORIENTATION_ANSWER_OPTIONS_ROWS)}
          value={{}}
          lang="en"
          langDefault="en"
        />,
      )

      const table = within(screen.getByRole('table'))
      const rowLabelCell = table.getByText('Very Satisfied').closest('td')
      const columnHeaderCell = table.getByText('Food').closest('td')

      expect(rowLabelCell).toBeInTheDocument()
      expect(columnHeaderCell).toBeInTheDocument()
      // row labels live in tbody, column headers live in thead
      expect(rowLabelCell?.closest('tbody')).not.toBeNull()
      expect(columnHeaderCell?.closest('thead')).not.toBeNull()
    })

    it('applies the sticky positioning classes to the row-label cell', () => {
      render(
        <QuestionTypeMatrix
          question={buildQuestion(MATRIX_ORIENTATION_ANSWER_OPTIONS_ROWS)}
          value={{}}
          lang="en"
          langDefault="en"
        />,
      )

      const rowLabelCell = within(screen.getByRole('table'))
        .getByText('Very Satisfied')
        .closest('td')
      MATRIX_STICKY_LABEL_CLASSES.forEach((cls) =>
        expect(rowLabelCell).toHaveClass(cls),
      )
    })
  })

  describe('orientation: subquestions as rows', () => {
    it('renders subquestions as row labels and answer options as column headers', () => {
      render(
        <QuestionTypeMatrix
          question={buildQuestion(MATRIX_ORIENTATION_SUBQUESTIONS_ROWS)}
          value={{}}
          lang="en"
          langDefault="en"
        />,
      )

      const table = within(screen.getByRole('table'))
      const rowLabelCell = table.getByText('Food').closest('td')
      const columnHeaderCell = table.getByText('Very Satisfied').closest('td')

      expect(rowLabelCell).toBeInTheDocument()
      expect(columnHeaderCell).toBeInTheDocument()
      expect(rowLabelCell?.closest('tbody')).not.toBeNull()
      expect(columnHeaderCell?.closest('thead')).not.toBeNull()
    })

    it('applies the sticky positioning classes to the row-label cell', () => {
      render(
        <QuestionTypeMatrix
          question={buildQuestion(MATRIX_ORIENTATION_SUBQUESTIONS_ROWS)}
          value={{}}
          lang="en"
          langDefault="en"
        />,
      )

      const rowLabelCell = within(screen.getByRole('table'))
        .getByText('Food')
        .closest('td')
      MATRIX_STICKY_LABEL_CLASSES.forEach((cls) =>
        expect(rowLabelCell).toHaveClass(cls),
      )
    })
  })

  describe('response data nesting (subquestion-outer, answer-option-inner)', () => {
    it('reads a checked cell from { [subquestionCode]: { [answerOptionCode]: true } }', () => {
      render(
        <QuestionTypeMatrix
          question={buildQuestion(MATRIX_ORIENTATION_ANSWER_OPTIONS_ROWS)}
          value={{ SQ1: { AO1: true } }}
          lang="en"
          langDefault="en"
        />,
      )

      const checkbox = document.getElementById('matrix-checkbox-sq1-ao1')
      expect(checkbox).toHaveAttribute('aria-checked', 'true')
      const otherCheckbox = document.getElementById('matrix-checkbox-sq2-ao1')
      expect(otherCheckbox).toHaveAttribute('aria-checked', 'false')
    })

    it('writes a checked cell as { [subquestionCode]: { [answerOptionCode]: true } }', () => {
      const handleChange = jest.fn()
      render(
        <QuestionTypeMatrix
          question={buildQuestion(MATRIX_ORIENTATION_ANSWER_OPTIONS_ROWS)}
          value={{}}
          lang="en"
          langDefault="en"
          onChange={handleChange}
        />,
      )

      const checkbox = document.getElementById('matrix-checkbox-sq1-ao1')
      expect(checkbox).not.toBeNull()
      fireEvent.click(checkbox as Element)

      expect(handleChange).toHaveBeenCalledWith({ SQ1: { AO1: true } })
    })
  })

  describe('column header alignment', () => {
    const LONG_LABEL =
      'This is a very long column header label that could overlap adjacent columns'

    it('centres the column header text regardless of column label length', () => {
      render(
        <QuestionTypeMatrix
          question={buildQuestion(MATRIX_ORIENTATION_ANSWER_OPTIONS_ROWS)}
          value={{}}
          lang="en"
          langDefault="en"
        />,
      )

      const table = within(screen.getByRole('table'))
      const columnHeaderCell = table.getByText('Food').closest('td')
      expect(columnHeaderCell).toHaveClass('text-center')
    })

    it('wraps a checkbox-style (non-radio) matrix cell in ToggleCell and keeps it centred with a long column label', () => {
      const question: SurveyQuestion = {
        _id: 'q1',
        code: 'Q1',
        answerOptions: [
          { _id: 'ao1', code: 'AO1', label: { getLang: () => LONG_LABEL } },
        ],
        subquestions: [
          {
            _id: 'sq1',
            code: 'SQ1',
            text: { getLang: () => 'Food' },
            type: QUESTION_TYPE_CHECKBOX,
            attributes: {},
          },
        ],
        attributes: {
          [ATTRIBUTE_MATRIX_ORIENTATION]:
            MATRIX_ORIENTATION_ANSWER_OPTIONS_ROWS,
        },
      } as unknown as SurveyQuestion

      render(
        <QuestionTypeMatrix
          question={question}
          value={{}}
          lang="en"
          langDefault="en"
        />,
      )

      const checkbox = document.getElementById('matrix-checkbox-sq1-ao1')
      expect(checkbox).not.toBeNull()

      // ToggleCell wraps the checkbox in a `flex justify-center` div.
      const toggleCellWrapper = checkbox?.parentElement
      expect(toggleCellWrapper).toHaveClass('flex')
      expect(toggleCellWrapper).toHaveClass('justify-center')

      // The long column label doesn't push the cell's own centring off.
      const cell = checkbox?.closest('td')
      expect(cell).toHaveClass('text-center')
    })
  })

  describe('date/time/datetime column width', () => {
    function buildWideControlQuestion(subquestionType: string): SurveyQuestion {
      return {
        _id: 'q1',
        code: 'Q1',
        answerOptions: [
          { _id: 'ao1', code: 'AO1', label: { getLang: () => 'You' } },
          { _id: 'ao2', code: 'AO2', label: { getLang: () => 'Mother' } },
        ],
        subquestions: [
          {
            _id: 'sq1',
            code: 'SQ1',
            text: { getLang: () => 'DOB' },
            type: subquestionType,
            attributes: {},
          },
        ],
        attributes: {
          [ATTRIBUTE_MATRIX_ORIENTATION]: MATRIX_ORIENTATION_SUBQUESTIONS_ROWS,
        },
      } as unknown as SurveyQuestion
    }

    // jsdom reports 0 for scrollWidth, so the natural-width measurement always
    // bottoms out and the column is sized purely by the type-specific floor —
    // exactly what regresses if that floor is ever dropped or shrunk.
    it.each([
      [QUESTION_TYPE_DATE, 200],
      [QUESTION_TYPE_TIME, 150],
      [QUESTION_TYPE_DATETIME, 240],
    ])(
      'gives a %s column at least %dpx so the value is not truncated',
      (type, minWidth) => {
        render(
          <QuestionTypeMatrix
            question={buildWideControlQuestion(type)}
            value={{}}
            lang="en"
            langDefault="en"
          />,
        )

        const cols = document.querySelectorAll('colgroup col')
        // First <col> is the row-label column (no explicit width); data columns follow.
        const dataCol = cols[1] as HTMLElement
        expect(dataCol.style.width).toBe(`${minWidth}px`)
      },
    )
  })
})
