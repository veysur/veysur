import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Survey as SurveyEntity } from 'veysur-common'

import { ThankYouLinkUrlInput } from './ThankYouLinkUrlInput'

const clearSurveyThankYouLink = jest.fn()

jest.mock('appAdmin/component/SurveyEditor', () => ({
  useSurveyEditorStore: (
    selector: (state: {
      operations: { clearSurveyThankYouLink: () => void }
    }) => unknown,
  ) => selector({ operations: { clearSurveyThankYouLink } }),
}))

function makeSurvey(url: Record<string, string>, text: Record<string, string>) {
  return new SurveyEntity({
    sections: [
      {
        _id: 'THANKYOU',
        code: 'THANKYOU',
        kind: 'thankYou',
        config: { link: { url, text } },
      },
    ],
  } as unknown as ConstructorParameters<typeof SurveyEntity>[0])
}

describe('ThankYouLinkUrlInput', () => {
  beforeEach(() => {
    clearSurveyThankYouLink.mockClear()
  })

  const baseProps = {
    config: { name: 'End URL' } as never,
    isValid: true,
    onChange: jest.fn(),
    value: '',
  }

  test('does not render Clear All Languages when nothing is set', () => {
    render(<ThankYouLinkUrlInput {...baseProps} entity={makeSurvey({}, {})} />)

    expect(
      screen.queryByRole('button', { name: /clear all languages/i }),
    ).not.toBeInTheDocument()
  })

  test('clears the link for every language after confirmation', () => {
    render(
      <ThankYouLinkUrlInput
        {...baseProps}
        entity={makeSurvey(
          { en: 'https://example.com', fr: 'https://example.fr' },
          { en: 'Go', fr: 'Aller' },
        )}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: /clear all languages/i }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))

    expect(clearSurveyThankYouLink).toHaveBeenCalledTimes(1)
  })
})
