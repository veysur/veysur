import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import { dateColumn } from './columns'

interface Row {
  created?: string
  total?: number
  code?: string
}

describe('dateColumn', () => {
  test('formats a present date with the default format', () => {
    const column = dateColumn<Row>({
      key: 'date',
      getDate: (row) => row.created,
    })
    render(<>{column.render({ created: '2026-01-15T00:00:00Z' })}</>)
    expect(screen.getByText('15 Jan 2026')).toBeInTheDocument()
  })

  test('falls back to an em dash when the date is missing', () => {
    const column = dateColumn<Row>({
      key: 'date',
      getDate: (row) => row.created,
    })
    render(<>{column.render({})}</>)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  test('defaults to className w-28', () => {
    const column = dateColumn<Row>({
      key: 'date',
      getDate: (row) => row.created,
    })
    expect(column.className).toBe('w-28')
  })

  test('applies a className override', () => {
    const column = dateColumn<Row>({
      key: 'date',
      getDate: (row) => row.created,
      className: 'w-32',
    })
    expect(column.className).toBe('w-32')
  })
})
