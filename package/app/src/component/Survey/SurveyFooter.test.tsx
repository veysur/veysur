import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SurveyFooter } from './SurveyFooter'

describe('SurveyFooter', () => {
  test('links to the marketing website using PUBLIC_APP_DOMAIN and current protocol, opened in a new tab', () => {
    process.env.PUBLIC_APP_DOMAIN = 'veysur.com'
    render(<SurveyFooter />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute(
      'href',
      `${window.location.protocol}//www.veysur.com`,
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('falls back to veysur.com when PUBLIC_APP_DOMAIN is unset', () => {
    delete process.env.PUBLIC_APP_DOMAIN
    render(<SurveyFooter />)

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      `${window.location.protocol}//www.veysur.com`,
    )
  })
})
