import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

import { MapPinView } from './MapPinView'
import { loadMapProvider } from './loadMapProvider'

jest.mock('./loadMapProvider', () => ({ loadMapProvider: jest.fn() }))

const mockLoadMapProvider = loadMapProvider as jest.MockedFunction<
  typeof loadMapProvider
>

describe('MapPinView', () => {
  it('draws the pin on an OpenStreetMap and cleans up', async () => {
    const handle = {
      setPin: jest.fn(),
      clearPin: jest.fn(),
      destroy: jest.fn(),
    }
    const createMap = jest.fn().mockResolvedValue(handle)
    mockLoadMapProvider.mockResolvedValue({
      name: 'osm',
      createMap,
      search: jest.fn(),
      reverse: jest.fn(),
    })

    const { unmount } = render(<MapPinView lat={51.5} lng={-0.12} />)

    await waitFor(() => expect(handle.setPin).toHaveBeenCalledWith(51.5, -0.12))
    expect(mockLoadMapProvider).toHaveBeenCalledWith('osm', '')
    unmount()
    expect(handle.destroy).toHaveBeenCalled()
  })

  it('says so when the map cannot load', async () => {
    mockLoadMapProvider.mockRejectedValue(new Error('offline'))

    render(<MapPinView lat={1} lng={2} />)

    expect(
      await screen.findByText('The map could not be loaded.'),
    ).toBeInTheDocument()
  })
})
