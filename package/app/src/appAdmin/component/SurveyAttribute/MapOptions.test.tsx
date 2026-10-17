import { render, fireEvent, screen } from '@testing-library/react'
import { MapOptions as MapOptionsValue } from 'veysur-common'

import { MapOptions } from './MapOptions'
import { AttributeConfig } from '../SurveyAttributesPanel/attributesConfig'

const VALUE: MapOptionsValue = {
  provider: 'default',
  centerLat: null,
  centerLng: null,
  zoom: null,
  addressSearch: true,
  useMyLocation: false,
  countries: '',
  precision: 'exact',
}

function renderEditor(value: MapOptionsValue = VALUE) {
  const onChange = jest.fn()
  render(
    <MapOptions
      entity={{} as never}
      config={{ name: 'Map Options', initialValue: VALUE } as AttributeConfig}
      onChange={onChange}
      isValid={true}
      value={value}
    />,
  )
  return onChange
}

describe('MapOptions', () => {
  it('shows the current start position', () => {
    renderEditor({ ...VALUE, centerLat: 48.8, centerLng: 2.3, zoom: 9 })

    const [lat, lng, zoom] = screen.getAllByRole(
      'spinbutton',
    ) as HTMLInputElement[]
    expect([lat.value, lng.value, zoom.value]).toEqual(['48.8', '2.3', '9'])
  })

  it('reports a full value object when the zoom changes', () => {
    const onChange = renderEditor({ ...VALUE, centerLat: 1, centerLng: 2 })

    fireEvent.change(screen.getByLabelText('Zoom (1 to 18)'), {
      target: { value: '10' },
    })

    expect(onChange).toHaveBeenCalledWith({
      ...VALUE,
      centerLat: 1,
      centerLng: 2,
      zoom: 10,
    })
  })

  it('toggles address search and device location', () => {
    const onChange = renderEditor()

    const [search, location] = screen.getAllByRole('checkbox')
    expect(search).toBeChecked()
    expect(location).not.toBeChecked()

    fireEvent.click(search)
    expect(onChange).toHaveBeenLastCalledWith({
      ...VALUE,
      addressSearch: false,
    })

    fireEvent.click(location)
    expect(onChange).toHaveBeenLastCalledWith({
      ...VALUE,
      addressSearch: false,
      useMyLocation: true,
    })
  })

  it('explains that anonymous surveys use approximate locations', () => {
    renderEditor()

    expect(
      screen.getByText(/Anonymous surveys always use approximate locations/),
    ).toBeInTheDocument()
  })
  it('clearing a field reports null', () => {
    const onChange = renderEditor({
      ...VALUE,
      centerLat: 1,
      centerLng: 2,
      zoom: 9,
    })

    fireEvent.change(screen.getByLabelText('Zoom (1 to 18)'), {
      target: { value: '' },
    })

    expect(onChange).toHaveBeenCalledWith({
      ...VALUE,
      centerLat: 1,
      centerLng: 2,
      zoom: null,
    })
  })

  it('accepts a latitude of zero', () => {
    const onChange = renderEditor()

    fireEvent.click(screen.getByRole('button', { name: 'Fixed point' }))
    fireEvent.change(screen.getByLabelText('Latitude'), {
      target: { value: '0' },
    })

    expect(onChange).toHaveBeenCalledWith({ ...VALUE, centerLat: 0 })
  })

  it('warns when only one coordinate is set', () => {
    renderEditor({ ...VALUE, centerLat: 51.5 })

    expect(
      screen.getByText('Set both latitude and longitude, or leave both blank.'),
    ).toBeInTheDocument()
  })

  it('does not warn when both or neither are set', () => {
    renderEditor({ ...VALUE, centerLat: 51.5, centerLng: -0.1 })

    expect(screen.queryByText(/Set both latitude/)).toBeNull()
  })
  it('hides the coordinate fields for an automatic starting view', () => {
    renderEditor()

    expect(screen.queryByLabelText('Latitude')).toBeNull()
    expect(screen.queryByLabelText('Zoom (1 to 18)')).toBeNull()
    expect(screen.getByText(/Opens near the participant/)).toBeInTheDocument()
  })

  it('opens a saved centre as a fixed point with zoom enabled', () => {
    renderEditor({ ...VALUE, centerLat: 51.5, centerLng: -0.1 })

    expect(screen.getByLabelText('Zoom (1 to 18)')).toBeEnabled()
  })

  it('shows the coordinate fields without changing the value when switching to a fixed point', () => {
    const onChange = renderEditor()

    fireEvent.click(screen.getByRole('button', { name: 'Fixed point' }))

    expect(screen.getByLabelText('Latitude')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('clears the starting view when switching back to automatic', () => {
    const onChange = renderEditor({
      ...VALUE,
      centerLat: 1,
      centerLng: 2,
      zoom: 9,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Automatic' }))

    expect(onChange).toHaveBeenCalledWith(VALUE)
    expect(screen.queryByLabelText('Latitude')).toBeNull()
  })

  it('mentions the Google Maps key only for the Google provider', () => {
    renderEditor()
    expect(screen.queryByText(/Needs a Google Maps key/)).toBeNull()
  })

  it('explains the Google Maps key fallback for the Google provider', () => {
    renderEditor({ ...VALUE, provider: 'google' })
    expect(screen.getByText(/Needs a Google Maps key/)).toBeInTheDocument()
  })
})
