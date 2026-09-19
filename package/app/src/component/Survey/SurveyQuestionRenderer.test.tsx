import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import {
  SurveyQuestion,
  ExpressionContext,
  ExpressionContextBuilder,
  ParticipantData,
  buildQuestionInfoBase,
} from 'veysur-common'
import { SurveyQuestionRenderer } from './SurveyQuestionRenderer'
import type {
  SurveyPresentationConfig,
  SurveyContentFormatConfig,
} from './SurveyTypes'

jest.mock('component/SurveyQuestionType/getQuestionType', () => ({
  getQuestionTypeByName: () => null,
}))

const presentation: SurveyPresentationConfig = {}
const contentFormat: SurveyContentFormatConfig = {
  format: 'markdown',
  scriptTagsAllowed: false,
}

const makeQuestion = (
  code: string,
  text: string,
  detail?: string,
): SurveyQuestion =>
  new SurveyQuestion({
    _id: `q-${code}`,
    sectionId: 'g1',
    code,
    type: 'text',
    text: { en: text },
    detail: detail ? { en: detail } : null,
  })

/**
 * Mirrors `Survey.tsx`'s position-scoped context factory: the context for
 * question `id` sees only answers/questions strictly before it in `order`.
 */
const makeGetExpressionContext =
  (
    order: SurveyQuestion[],
    answers: Record<string, unknown>,
    participantData: ParticipantData = {},
  ) =>
  (questionId: string): ExpressionContext => {
    const index = order.findIndex((q) => q._id === questionId)
    const priorCount = index < 0 ? order.length : index
    return ExpressionContextBuilder.build(
      participantData,
      order
        .slice(0, priorCount)
        .map((q) => ({ questionCode: q.code, value: answers[q.code] })),
      order.map((q, i) => ({
        ...buildQuestionInfoBase(q, i),
        text: q.text?.getLang('en', 'en'),
      })),
      { language: 'en' },
    )
  }

describe('SurveyQuestionRenderer - previous-answer references', () => {
  it('resolves a {{answers.x}} reference to an already-answered question', () => {
    const q1 = makeQuestion('Q001', 'Where do you live?')
    const q2 = makeQuestion('Q002', 'So you live in {{answers.Q001}}?')

    render(
      <SurveyQuestionRenderer
        question={q2}
        presentation={presentation}
        contentFormat={contentFormat}
        lang="en"
        langDefault="en"
        globalQuestionIndex={1}
        answers={{ Q001: 'Liverpool' }}
        getExpressionContext={makeGetExpressionContext([q1, q2], {
          Q001: 'Liverpool',
        })}
        onAnswerChange={jest.fn()}
        validationErrors={{}}
      />,
    )

    expect(screen.getByText('So you live in Liverpool?')).toBeInTheDocument()
  })

  it('resolves a {{participant.x}} reference', () => {
    const q1 = makeQuestion('Q001', 'Hi {{participant.nameFirst}}, ready?')
    render(
      <SurveyQuestionRenderer
        question={q1}
        presentation={presentation}
        contentFormat={contentFormat}
        lang="en"
        langDefault="en"
        globalQuestionIndex={0}
        answers={{}}
        getExpressionContext={makeGetExpressionContext(
          [q1],
          {},
          {
            nameFirst: 'Jane',
          },
        )}
        onAnswerChange={jest.fn()}
        validationErrors={{}}
      />,
    )

    expect(screen.getByText('Hi Jane, ready?')).toBeInTheDocument()
  })

  it('does not resolve a reference to a later question - forward references stay literal', () => {
    const q1 = makeQuestion('Q001', 'Preview of next answer: {{answers.Q002}}')
    const q2 = makeQuestion('Q002', 'What is your favourite colour?')

    render(
      <SurveyQuestionRenderer
        question={q1}
        presentation={presentation}
        contentFormat={contentFormat}
        lang="en"
        langDefault="en"
        globalQuestionIndex={0}
        answers={{ Q002: 'Blue' }}
        getExpressionContext={makeGetExpressionContext([q1, q2], {
          Q002: 'Blue',
        })}
        onAnswerChange={jest.fn()}
        validationErrors={{}}
      />,
    )

    expect(
      screen.getByText('Preview of next answer: {{answers.Q002}}'),
    ).toBeInTheDocument()
  })

  it('resolves a reference in question detail text', () => {
    const q1 = makeQuestion('Q001', 'City')
    const q2 = makeQuestion(
      'Q002',
      'Confirm',
      'You told us {{answers.Q001}} earlier.',
    )

    render(
      <SurveyQuestionRenderer
        question={q2}
        presentation={presentation}
        contentFormat={contentFormat}
        lang="en"
        langDefault="en"
        globalQuestionIndex={1}
        answers={{ Q001: 'Liverpool' }}
        getExpressionContext={makeGetExpressionContext([q1, q2], {
          Q001: 'Liverpool',
        })}
        onAnswerChange={jest.fn()}
        validationErrors={{}}
      />,
    )

    expect(
      screen.getByText('You told us Liverpool earlier.'),
    ).toBeInTheDocument()
  })

  it('resolves an {{answerLabels.x}} reference to a prior choice answer', () => {
    const q1 = makeQuestion('Q001', 'Colour')
    const q2 = makeQuestion('Q002', 'You chose {{answerLabels.Q001}}.')

    const getExpressionContext = (questionId: string): ExpressionContext => {
      const order = [q1, q2]
      const index = order.findIndex((q) => q._id === questionId)
      return ExpressionContextBuilder.build(
        {},
        order.slice(0, index).map((q) => ({
          questionCode: q.code,
          value: q.code === 'Q001' ? { A001: true } : undefined,
        })),
        order.map((q, i) => ({
          ...buildQuestionInfoBase(q, i),
          type: q.code === 'Q001' ? 'checkbox' : 'text',
          text: q.text?.getLang('en', 'en'),
          answerOptionCodes: q.code === 'Q001' ? ['A001', 'A002'] : undefined,
          answerOptions:
            q.code === 'Q001'
              ? [
                  { code: 'A001', label: 'Blue' },
                  { code: 'A002', label: 'Green' },
                ]
              : undefined,
        })),
        { language: 'en' },
      )
    }

    render(
      <SurveyQuestionRenderer
        question={q2}
        presentation={presentation}
        contentFormat={contentFormat}
        lang="en"
        langDefault="en"
        globalQuestionIndex={1}
        answers={{ Q001: { A001: true } }}
        getExpressionContext={getExpressionContext}
        onAnswerChange={jest.fn()}
        validationErrors={{}}
      />,
    )

    expect(screen.getByText('You chose Blue.')).toBeInTheDocument()
  })

  it('does not double-encode a resolved value in a plain-format survey', () => {
    const q1 = makeQuestion('Q001', 'Age')
    const q2 = makeQuestion('Q002', 'You said {{answers.Q001}}')

    render(
      <SurveyQuestionRenderer
        question={q2}
        presentation={presentation}
        contentFormat={{ format: 'plain', scriptTagsAllowed: false }}
        lang="en"
        langDefault="en"
        globalQuestionIndex={1}
        answers={{ Q001: "it's 18" }}
        getExpressionContext={makeGetExpressionContext([q1, q2], {
          Q001: "it's 18",
        })}
        onAnswerChange={jest.fn()}
        validationErrors={{}}
      />,
    )

    expect(screen.getByText("You said it's 18")).toBeInTheDocument()
  })
})
