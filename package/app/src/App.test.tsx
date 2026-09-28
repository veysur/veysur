import { act, render, screen } from '@testing-library/react'

import { App } from 'appAdmin/App'

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  RouterProvider: () => <div data-testid="router-provider">Router</div>,
}))

// Mock the router
jest.mock('appAdmin/Router', () => ({
  router: {},
}))

// Mock ReactQueryDevtools to prevent lazy Suspense resolution warnings
jest.mock('@tanstack/react-query-devtools', () => ({
  ReactQueryDevtools: () => null,
}))

describe('App', () => {
  test('renders without crashing', async () => {
    await act(async () => {
      render(<App />)
    })
    const appElement = screen.getByTestId('admin-app-container')
    expect(appElement).toBeInTheDocument()
  })
})
