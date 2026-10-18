import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import { BaseMapsSettings } from './BaseMapsSettings'

describe('BaseMapsSettings', () => {
  it('masks the stored key', () => {
    render(
      <BaseMapsSettings
        data={{ source: null, maps: { googleApiKey: 'abc' } }}
        handlers={{}}
      />,
    )

    const input = screen.getByLabelText('Google Maps API key')
    expect(input).toHaveAttribute('type', 'password')
    expect(input).toHaveValue('abc')
  })

  it('reports edits, including clearing the key', () => {
    const handleStringChange = jest.fn()
    render(
      <BaseMapsSettings
        data={{ source: null, maps: { googleApiKey: 'abc' } }}
        handlers={{ handleStringChange }}
      />,
    )

    fireEvent.change(screen.getByLabelText('Google Maps API key'), {
      target: { value: '' },
    })

    expect(handleStringChange).toHaveBeenCalledWith('maps', 'googleApiKey', '')
  })

  describe('on a survey', () => {
    const surveyData = (googleApiKey: string | null) => ({
      source: null,
      maps: { googleApiKey },
      getDefault: <V,>() => 'project-key' as V,
    })

    it('inherits the project key until overridden', () => {
      render(<BaseMapsSettings data={surveyData(null)} handlers={{}} />)

      expect(screen.getByPlaceholderText('Project key saved')).toBeDisabled()
    })

    it('clears the override when "use default" is ticked', () => {
      const handleStringChange = jest.fn()
      render(
        <BaseMapsSettings
          data={surveyData('survey-key')}
          handlers={{ handleStringChange }}
        />,
      )

      fireEvent.click(screen.getByRole('checkbox'))

      expect(handleStringChange).toHaveBeenCalledWith(
        'maps',
        'googleApiKey',
        null,
      )
    })
  })
})
