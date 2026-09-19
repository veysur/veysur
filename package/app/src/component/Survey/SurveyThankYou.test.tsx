import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Survey as SurveyEntity } from 'veysur-common'
import { SurveyThankYou } from './SurveyThankYou'
import type { SurveyContentFormatConfig } from './SurveyTypes'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const contentFormat: SurveyContentFormatConfig = {
  format: 'html',
  scriptTagsAllowed: false,
}

describe('SurveyThankYou', () => {
  test('does not render a Print button when showPrint is false', () => {
    render(
      <SurveyThankYou
        survey={undefined}
        contentFormat={contentFormat}
        lang="en"
        langDefault="en"
        showPrint={false}
        onPrint={jest.fn()}
      />,
    )

    expect(
      screen.queryByRole('button', { name: /print\.button/i }),
    ).not.toBeInTheDocument()
  })

  test('does not render a Print button when onPrint is not provided', () => {
    render(
      <SurveyThankYou
        survey={undefined}
        contentFormat={contentFormat}
        lang="en"
        langDefault="en"
        showPrint={true}
      />,
    )

    expect(
      screen.queryByRole('button', { name: /print\.button/i }),
    ).not.toBeInTheDocument()
  })

  test('renders a Print button and calls onPrint when clicked', () => {
    const onPrint = jest.fn()
    render(
      <SurveyThankYou
        survey={undefined}
        contentFormat={contentFormat}
        lang="en"
        langDefault="en"
        showPrint={true}
        onPrint={onPrint}
      />,
    )

    const button = screen.getByRole('button', { name: 'print.button' })
    fireEvent.click(button)

    expect(onPrint).toHaveBeenCalledTimes(1)
  })

  test('renders the thank you message', () => {
    const survey = new SurveyEntity({
      sections: [
        {
          _id: 'THANKYOU',
          code: 'THANKYOU',
          kind: 'thankYou',
          desc: { en: '<h2>Thanks a lot!</h2>' },
          config: { link: { url: {}, text: {} } },
        },
      ],
    } as unknown as ConstructorParameters<typeof SurveyEntity>[0])

    render(
      <SurveyThankYou
        survey={survey}
        contentFormat={contentFormat}
        lang="en"
        langDefault="en"
        showPrint={false}
      />,
    )

    expect(screen.getByText('Thanks a lot!')).toBeInTheDocument()
  })

  test('renders the End URL link when a URL is set', () => {
    const survey = new SurveyEntity({
      sections: [
        {
          _id: 'THANKYOU',
          code: 'THANKYOU',
          kind: 'thankYou',
          desc: { en: '' },
          config: {
            link: { url: { en: 'https://example.com' }, text: { en: 'Go' } },
          },
        },
      ],
    } as unknown as ConstructorParameters<typeof SurveyEntity>[0])

    render(
      <SurveyThankYou
        survey={survey}
        contentFormat={contentFormat}
        lang="en"
        langDefault="en"
      />,
    )

    expect(screen.getByRole('link', { name: /go/i })).toHaveAttribute(
      'href',
      'https://example.com',
    )
  })

  test('does not render the End URL link when showLink is false', () => {
    const survey = new SurveyEntity({
      sections: [
        {
          _id: 'THANKYOU',
          code: 'THANKYOU',
          kind: 'thankYou',
          desc: { en: '' },
          config: {
            link: { url: { en: 'https://example.com' }, text: { en: 'Go' } },
          },
        },
      ],
    } as unknown as ConstructorParameters<typeof SurveyEntity>[0])

    render(
      <SurveyThankYou
        survey={survey}
        contentFormat={contentFormat}
        lang="en"
        langDefault="en"
        showLink={false}
      />,
    )

    expect(screen.queryByRole('link', { name: /go/i })).not.toBeInTheDocument()
  })
})
