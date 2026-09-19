import { render, screen, fireEvent } from '@testing-library/react'
import {
  SurveyQuestion,
  CHOICE_OTHER_CODE,
  CHOICE_OTHER_VALUE_KEY,
} from 'veysur-common'

import { MultipleChoiceCheckbox } from './MultipleChoiceCheckbox'

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
    ],
    attributes: {
      choiceMinMax: overrides.choiceMinMax ?? { min: 0, max: 0 },
      choiceOther: overrides.choiceOther ?? false,
    },
  } as unknown as SurveyQuestion
}

describe('MultipleChoiceCheckbox', () => {
  describe('radio mode (min:0, max:1)', () => {
    it('renders radio inputs and selects a single option', () => {
      const onChange = jest.fn()
      render(
        <MultipleChoiceCheckbox
          question={buildQuestion({ choiceMinMax: { min: 0, max: 1 } })}
          value={{}}
          lang="en"
          langDefault="en"
          onChange={onChange}
        />,
      )

      fireEvent.click(screen.getByLabelText('Option A'))

      expect(onChange).toHaveBeenCalledWith({ A1: true })
    })
  })

  describe('checkbox mode (min:0, max:0 - no limit)', () => {
    it('adds a key when a checkbox is checked', () => {
      const onChange = jest.fn()
      render(
        <MultipleChoiceCheckbox
          question={buildQuestion()}
          value={{}}
          lang="en"
          langDefault="en"
          onChange={onChange}
        />,
      )

      fireEvent.click(screen.getByLabelText('Option A'))

      expect(onChange).toHaveBeenCalledWith({ A1: true })
    })

    it('removes a key when its checkbox is unchecked', () => {
      const onChange = jest.fn()
      render(
        <MultipleChoiceCheckbox
          question={buildQuestion()}
          value={{ A1: true, A2: true }}
          lang="en"
          langDefault="en"
          onChange={onChange}
        />,
      )

      fireEvent.click(screen.getByLabelText('Option A'))

      expect(onChange).toHaveBeenCalledWith({ A2: true })
    })

    it('removes the Other text value when Other is unchecked', () => {
      const onChange = jest.fn()
      render(
        <MultipleChoiceCheckbox
          question={buildQuestion({ choiceOther: true })}
          value={{
            [CHOICE_OTHER_CODE]: true,
            [CHOICE_OTHER_VALUE_KEY]: 'my answer',
          }}
          lang="en"
          langDefault="en"
          onChange={onChange}
        />,
      )

      fireEvent.click(screen.getByLabelText('Other'))

      expect(onChange).toHaveBeenCalledWith({})
    })

    it('shows a free-text input once Other is checked', () => {
      render(
        <MultipleChoiceCheckbox
          question={buildQuestion({ choiceOther: true })}
          value={{ [CHOICE_OTHER_CODE]: true }}
          lang="en"
          langDefault="en"
        />,
      )

      expect(screen.getByPlaceholderText('Please specify')).toBeInTheDocument()
    })
  })
})
