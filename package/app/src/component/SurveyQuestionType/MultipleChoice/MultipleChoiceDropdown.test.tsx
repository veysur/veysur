import { render, screen, fireEvent } from '@testing-library/react'
import {
  SurveyQuestion,
  CHOICE_OTHER_CODE,
  CHOICE_OTHER_VALUE_KEY,
} from 'veysur-common'

import { MultipleChoiceDropdown } from './MultipleChoiceDropdown'

function buildQuestion(
  overrides: Partial<{
    choiceMinMax: { min: number; max: number }
    choiceOther: boolean
  }> = {},
): SurveyQuestion {
  return {
    _id: 'q1',
    code: 'Q1',
    answerOptions: [
      { _id: 'a1', code: 'A1', label: { getLang: () => 'Option A' } },
      { _id: 'a2', code: 'A2', label: { getLang: () => 'Option B' } },
      { _id: 'a3', code: 'A3', label: { getLang: () => 'Option C' } },
    ],
    attributes: {
      choiceMinMax: overrides.choiceMinMax ?? { min: 0, max: 1 },
      choiceOther: overrides.choiceOther ?? false,
    },
  } as unknown as SurveyQuestion
}

describe('MultipleChoiceDropdown', () => {
  describe('single-select mode (min:0, max:1)', () => {
    it('renders the native select trigger', () => {
      render(
        <MultipleChoiceDropdown
          question={buildQuestion()}
          value={{}}
          lang="en"
          langDefault="en"
        />,
      )

      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('calls onChange with a single selected key', () => {
      const onChange = jest.fn()
      render(
        <MultipleChoiceDropdown
          question={buildQuestion()}
          value={{}}
          lang="en"
          langDefault="en"
          onChange={onChange}
        />,
      )

      fireEvent.click(screen.getByRole('combobox'))
      fireEvent.click(screen.getByText('Option A'))

      expect(onChange).toHaveBeenCalledWith({ A1: true })
    })
  })

  describe('multi-select mode (min:0, max:0 - no limit)', () => {
    it('renders a popover trigger button instead of the native select', () => {
      render(
        <MultipleChoiceDropdown
          question={buildQuestion({ choiceMinMax: { min: 0, max: 0 } })}
          value={{}}
          lang="en"
          langDefault="en"
        />,
      )

      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
      expect(screen.getByRole('button')).toHaveTextContent('Choose an option')
    })

    it('adds a key when a checkbox is checked', () => {
      const onChange = jest.fn()
      render(
        <MultipleChoiceDropdown
          question={buildQuestion({ choiceMinMax: { min: 0, max: 0 } })}
          value={{}}
          lang="en"
          langDefault="en"
          onChange={onChange}
        />,
      )

      fireEvent.click(screen.getByRole('button'))
      fireEvent.click(screen.getByText('Option A'))

      expect(onChange).toHaveBeenCalledWith({ A1: true })
    })

    it('removes a key when its checkbox is unchecked', () => {
      const onChange = jest.fn()
      render(
        <MultipleChoiceDropdown
          question={buildQuestion({ choiceMinMax: { min: 2, max: 5 } })}
          value={{ A1: true, A2: true }}
          lang="en"
          langDefault="en"
          onChange={onChange}
        />,
      )

      fireEvent.click(screen.getByRole('button'))
      fireEvent.click(screen.getByText('Option A'))

      expect(onChange).toHaveBeenCalledWith({ A2: true })
    })

    it('shows a comma-joined summary for two selections', () => {
      render(
        <MultipleChoiceDropdown
          question={buildQuestion({ choiceMinMax: { min: 0, max: 0 } })}
          value={{ A1: true, A2: true }}
          lang="en"
          langDefault="en"
        />,
      )

      expect(screen.getByRole('button')).toHaveTextContent('Option A, Option B')
    })

    it('shows a count summary for three or more selections', () => {
      render(
        <MultipleChoiceDropdown
          question={buildQuestion({ choiceMinMax: { min: 0, max: 0 } })}
          value={{ A1: true, A2: true, A3: true }}
          lang="en"
          langDefault="en"
        />,
      )

      expect(screen.getByRole('button')).toHaveTextContent('3 selected')
    })
  })

  describe('"Other" option', () => {
    it('shows a free-text input in single-select mode once Other is chosen', () => {
      const onChange = jest.fn()
      const { rerender } = render(
        <MultipleChoiceDropdown
          question={buildQuestion({ choiceOther: true })}
          value={{}}
          lang="en"
          langDefault="en"
          onChange={onChange}
        />,
      )

      fireEvent.click(screen.getByRole('combobox'))
      fireEvent.click(screen.getByText('Other'))
      expect(onChange).toHaveBeenCalledWith({ [CHOICE_OTHER_CODE]: true })

      rerender(
        <MultipleChoiceDropdown
          question={buildQuestion({ choiceOther: true })}
          value={{ [CHOICE_OTHER_CODE]: true }}
          lang="en"
          langDefault="en"
          onChange={onChange}
        />,
      )

      expect(screen.getByPlaceholderText('Please specify')).toBeInTheDocument()
    })

    it('removes the Other text value when unchecked in multi-select mode', () => {
      const onChange = jest.fn()
      render(
        <MultipleChoiceDropdown
          question={buildQuestion({
            choiceMinMax: { min: 0, max: 0 },
            choiceOther: true,
          })}
          value={{
            [CHOICE_OTHER_CODE]: true,
            [CHOICE_OTHER_VALUE_KEY]: 'my answer',
          }}
          lang="en"
          langDefault="en"
          onChange={onChange}
        />,
      )

      fireEvent.click(screen.getByRole('button'))
      fireEvent.click(screen.getByLabelText('Other'))

      expect(onChange).toHaveBeenCalledWith({})
    })
  })
})
