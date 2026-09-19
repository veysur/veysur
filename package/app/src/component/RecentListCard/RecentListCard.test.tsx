import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom'

import { RecentListCard } from './RecentListCard'
import { ColumnDefinition } from 'component/DataTable/types'

interface Row {
  id: string
  name: string
}

const columns: ColumnDefinition<Row>[] = [
  { key: 'name', title: 'Name', render: (row) => row.name },
]

describe('RecentListCard', () => {
  test('renders title and view all link', () => {
    render(
      <MemoryRouter>
        <RecentListCard
          title="Recent Payments"
          viewAllHref="/payment?projectId=abc"
          data={[]}
          columns={columns}
          getRowId={(row: Row) => row.id}
          emptyMessage="No payments"
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Recent Payments')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute(
      'href',
      '/payment?projectId=abc',
    )
  })

  test('renders the description when provided', () => {
    render(
      <MemoryRouter>
        <RecentListCard
          title="Recent Payments"
          description="Your recent payment history"
          viewAllHref="/payment"
          data={[]}
          columns={columns}
          getRowId={(row: Row) => row.id}
          emptyMessage="No payments"
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Your recent payment history')).toBeInTheDocument()
  })

  test('omits the description when not provided', () => {
    render(
      <MemoryRouter>
        <RecentListCard
          title="Recent Payments"
          viewAllHref="/payment"
          data={[]}
          columns={columns}
          getRowId={(row: Row) => row.id}
          emptyMessage="No payments"
        />
      </MemoryRouter>,
    )

    expect(
      screen.queryByText('Your recent payment history'),
    ).not.toBeInTheDocument()
  })

  test('renders empty message when there is no data', () => {
    render(
      <MemoryRouter>
        <RecentListCard
          title="Recent Invoices"
          viewAllHref="/invoice"
          data={[]}
          columns={columns}
          getRowId={(row: Row) => row.id}
          emptyMessage="No invoices"
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('No invoices')).toBeInTheDocument()
  })

  test('calls onRowClick when a row is clicked', () => {
    const onRowClick = jest.fn()
    const data: Row[] = [{ id: '1', name: 'Alpha' }]

    render(
      <MemoryRouter>
        <RecentListCard
          title="Recent Invoices"
          viewAllHref="/invoice"
          data={data}
          columns={columns}
          getRowId={(row: Row) => row.id}
          onRowClick={onRowClick}
          emptyMessage="No invoices"
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByText('Alpha'))
    expect(onRowClick).toHaveBeenCalledWith(data[0])
  })

  test('does not error when onRowClick is omitted', () => {
    const data: Row[] = [{ id: '1', name: 'Alpha' }]

    render(
      <MemoryRouter>
        <RecentListCard
          title="Recent Credit Notes"
          viewAllHref="/credit-note"
          data={data}
          columns={columns}
          getRowId={(row: Row) => row.id}
          emptyMessage="No credit notes"
        />
      </MemoryRouter>,
    )

    expect(() => fireEvent.click(screen.getByText('Alpha'))).not.toThrow()
  })
})
