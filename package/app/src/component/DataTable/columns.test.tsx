import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import { dateColumn, moneyColumn, codeColumn } from './columns'

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

describe('moneyColumn', () => {
  test('formats a positive amount without destructive styling', () => {
    const column = moneyColumn<Row>({
      key: 'total',
      getAmount: (row) => row.total,
    })
    render(<>{column.render({ total: 1000 })}</>)
    const el = screen.getByText('£10.00')
    expect(el).toBeInTheDocument()
    expect(el).not.toHaveClass('text-destructive')
  })

  test('treats a missing amount as zero', () => {
    const column = moneyColumn<Row>({
      key: 'total',
      getAmount: (row) => row.total,
    })
    render(<>{column.render({})}</>)
    expect(screen.getByText('£0.00')).toBeInTheDocument()
  })

  test('highlights negative amounts only when opted in', () => {
    const column = moneyColumn<Row>({
      key: 'total',
      getAmount: (row) => row.total,
      highlightNegative: true,
    })
    render(<>{column.render({ total: -500 })}</>)
    expect(screen.getByText('-£5.00')).toHaveClass('text-destructive')
  })

  test('does not highlight negative amounts by default', () => {
    const column = moneyColumn<Row>({
      key: 'total',
      getAmount: (row) => row.total,
    })
    render(<>{column.render({ total: -500 })}</>)
    expect(screen.getByText('-£5.00')).not.toHaveClass('text-destructive')
  })

  test('renders a dash for a zero amount when hideZero is set', () => {
    const column = moneyColumn<Row>({
      key: 'total',
      getAmount: (row) => row.total,
      hideZero: true,
    })
    render(<>{column.render({ total: 0 })}</>)
    expect(screen.getByText('-')).toBeInTheDocument()
    expect(screen.queryByText('£0.00')).not.toBeInTheDocument()
  })

  test('renders £0.00 for a zero amount when hideZero is not set', () => {
    const column = moneyColumn<Row>({
      key: 'total',
      getAmount: (row) => row.total,
    })
    render(<>{column.render({ total: 0 })}</>)
    expect(screen.getByText('£0.00')).toBeInTheDocument()
  })
})

describe('codeColumn', () => {
  const FULL_CODE = 'CUS-eV3yE36sVY8VHbD-INV-0000001'

  test('renders the shortened code value by default', () => {
    const column = codeColumn<Row>({
      key: 'code',
      title: 'Invoice',
      getCode: (row) => row.code,
    })
    render(<>{column.render({ code: FULL_CODE })}</>)
    expect(screen.getByText('INV-0000001')).toBeInTheDocument()
    expect(screen.queryByText(FULL_CODE)).not.toBeInTheDocument()
  })

  test('renders the raw code value when shorten is false', () => {
    const column = codeColumn<Row>({
      key: 'code',
      title: 'Invoice',
      getCode: (row) => row.code,
      shorten: false,
    })
    render(<>{column.render({ code: FULL_CODE })}</>)
    expect(screen.getByRole('button', { name: FULL_CODE })).toBeInTheDocument()
  })

  test('shows the full code in the tooltip on focus', async () => {
    const column = codeColumn<Row>({
      key: 'code',
      title: 'Invoice',
      getCode: (row) => row.code,
    })
    render(<>{column.render({ code: FULL_CODE })}</>)
    fireEvent.focus(screen.getByText('INV-0000001'))
    const matches = await screen.findAllByText(`${FULL_CODE} · Click to copy`)
    expect(matches.length).toBeGreaterThan(0)
  })

  test('copies the full code to the clipboard on click', () => {
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      configurable: true,
    })

    const column = codeColumn<Row>({
      key: 'code',
      title: 'Invoice',
      getCode: (row) => row.code,
    })
    render(<>{column.render({ code: FULL_CODE })}</>)
    fireEvent.click(screen.getByText('INV-0000001'))
    expect(writeText).toHaveBeenCalledWith(FULL_CODE)
  })

  test('falls back to an em dash when the code is missing', () => {
    const column = codeColumn<Row>({
      key: 'code',
      title: 'Invoice',
      getCode: (row) => row.code,
    })
    render(<>{column.render({})}</>)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  test('defaults to className w-40', () => {
    const column = codeColumn<Row>({
      key: 'code',
      title: 'Invoice',
      getCode: (row) => row.code,
    })
    expect(column.className).toBe('w-40')
  })
})
