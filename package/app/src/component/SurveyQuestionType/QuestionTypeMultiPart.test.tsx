import { render, screen, fireEvent } from '@testing-library/react'
import {
  SurveyQuestion,
  QUESTION_TYPE_TEXT,
  QUESTION_TYPE_NUMBER,
  QUESTION_TYPE_YES_NO,
  QUESTION_TYPE_POINT_5,
} from 'veysur-common'

import { QuestionTypeMultiPart } from './QuestionTypeMultiPart'

function buildQuestion(): SurveyQuestion {
  return {
    _id: 'q1',
    code: 'Q1',
    subquestions: [
      {
        _id: 'p1',
        code: 'P1',
        text: { getLang: () => 'First name' },
        type: QUESTION_TYPE_TEXT,
        attributes: {},
      },
      {
        _id: 'p2',
        code: 'P2',
        text: { getLang: () => 'Age' },
        type: QUESTION_TYPE_NUMBER,
        attributes: {},
      },
      {
        _id: 'p3',
        code: 'P3',
        text: { getLang: () => 'Employed' },
        type: QUESTION_TYPE_YES_NO,
        attributes: {},
      },
    ],
    attributes: {},
  } as unknown as SurveyQuestion
}

describe('QuestionTypeMultiPart', () => {
  it('renders one row per part, with its label and matching input', () => {
    render(
      <QuestionTypeMultiPart
        question={buildQuestion()}
        value={{}}
        lang="en"
        langDefault="en"
      />,
    )

    expect(screen.getByText('First name')).toBeInTheDocument()
    expect(screen.getByText('Age')).toBeInTheDocument()
    expect(screen.getByText('Employed')).toBeInTheDocument()
  })

  it('reads each part value from the flat { [partCode]: value } response shape', () => {
    render(
      <QuestionTypeMultiPart
        question={buildQuestion()}
        value={{ P1: 'Ada', P2: 30 }}
        lang="en"
        langDefault="en"
      />,
    )

    expect(screen.getByDisplayValue('Ada')).toBeInTheDocument()
    expect(screen.getByDisplayValue('30')).toBeInTheDocument()
  })

  it('writes a text part change as a flat { [partCode]: value } update', () => {
    const handleChange = jest.fn()
    render(
      <QuestionTypeMultiPart
        question={buildQuestion()}
        value={{ P2: 30 }}
        lang="en"
        langDefault="en"
        onChange={handleChange}
      />,
    )

    const textInput = screen.getByPlaceholderText('Type your answer here')
    fireEvent.change(textInput, { target: { value: 'Grace' } })

    expect(handleChange).toHaveBeenCalledWith({ P2: 30, P1: 'Grace' })
  })

  it('renders the shared point-scale label set once, above every part', () => {
    const question = {
      _id: 'q1',
      code: 'Q1',
      attributes: {},
      answerOptions: Array.from({ length: 5 }, (_, index) => ({
        _id: `a${index + 1}`,
        code: `P${index + 1}`,
        label: {
          getLang: () => (index === 0 ? 'Strongly disagree' : ''),
        },
      })),
      subquestions: [
        {
          _id: 'p1',
          code: 'P1',
          text: { getLang: () => 'Ease of use' },
          type: QUESTION_TYPE_POINT_5,
          attributes: {},
        },
        {
          _id: 'p2',
          code: 'P2',
          text: { getLang: () => 'Value for money' },
          type: QUESTION_TYPE_POINT_5,
          attributes: {},
        },
      ],
    } as unknown as SurveyQuestion

    render(
      <QuestionTypeMultiPart
        question={question}
        value={{}}
        lang="en"
        langDefault="en"
      />,
    )

    // Rendered once in the shared header, not repeated on each of the 2 parts
    expect(screen.getAllByText('Strongly disagree')).toHaveLength(1)
  })
})
