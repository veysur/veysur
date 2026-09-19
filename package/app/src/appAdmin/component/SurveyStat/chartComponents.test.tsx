import { render, screen, fireEvent } from '@testing-library/react'

import type { ChartType } from 'veysur-common'

import {
  ChartSettingsPopover,
  ChartTypeSelect,
  ChartValueModeSelect,
  DistributionBarChart,
  GroupedBarChart,
  PieGridChart,
  StatNumbersTable,
  StatSummaryGrid,
} from './chartComponents'

describe('StatNumbersTable', () => {
  it('wraps its children in a scrollable table', () => {
    const { container } = render(
      <StatNumbersTable>
        <tbody>
          <tr>
            <td>cell</td>
          </tr>
        </tbody>
      </StatNumbersTable>,
    )
    expect(
      container.querySelector('div.overflow-x-auto table'),
    ).toBeInTheDocument()
    expect(screen.getByText('cell')).toBeInTheDocument()
  })
})

describe('StatSummaryGrid', () => {
  it('renders each item label with a title attribute and its value', () => {
    render(
      <StatSummaryGrid
        items={[{ key: 'a', label: 'Alpha', value: '3 (60.0%)' }]}
      />,
    )
    expect(screen.getByText('Alpha')).toHaveAttribute('title', 'Alpha')
    expect(screen.getByText('3 (60.0%)')).toBeInTheDocument()
  })
})

describe('PieGridChart', () => {
  it('renders one captioned pie per cell', () => {
    const { container } = render(
      <PieGridChart
        cells={[
          {
            key: 'a',
            caption: 'Row A',
            slices: [{ name: 'Yes', value: 60, fill: '#111' }],
          },
          {
            key: 'b',
            caption: 'Row B',
            slices: [{ name: 'Yes', value: 40, fill: '#111' }],
          },
        ]}
      />,
    )
    expect(screen.getByText('Row A')).toBeInTheDocument()
    expect(screen.getByText('Row B')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-chart]')).toHaveLength(2)
  })
})

describe('GroupedBarChart', () => {
  const seriesKeys = [
    { key: 's1', label: 'Series one', color: '#111' },
    { key: 's2', label: 'Series two', color: '#222' },
  ]
  const data = [
    { name: 'Row A', s1: 1, s2: 2 },
    { name: 'Row B', s1: 3, s2: 4 },
  ]

  it('renders a chart container for both orientations', () => {
    for (const horizontal of [false, true]) {
      const { container, unmount } = render(
        <GroupedBarChart
          data={data}
          seriesKeys={seriesKeys}
          valueMode="count"
          horizontal={horizontal}
        />,
      )
      expect(container.querySelector('[data-chart]')).toBeInTheDocument()
      unmount()
    }
  })
})

describe('DistributionBarChart', () => {
  it('renders a chart container', () => {
    const data = [
      { name: 'Alpha', fill: '#111', count: 2 },
      { name: 'Beta', fill: '#222', count: 1 },
    ]
    const { container } = render(
      <DistributionBarChart
        data={data}
        dataKey="count"
        config={{}}
        valueMode="count"
      />,
    )
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })
})

describe('ChartTypeSelect', () => {
  it('renders nothing when only one chart type is available', () => {
    const { container } = render(
      <ChartTypeSelect value="bar" options={['bar']} onChange={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a dropdown when several chart types are available', () => {
    render(
      <ChartTypeSelect
        value="bar"
        options={['bar', 'horizontalBar', 'pie']}
        onChange={() => {}}
      />,
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })
})

describe('ChartValueModeSelect', () => {
  it('renders a combobox showing the current mode', () => {
    render(<ChartValueModeSelect value="percentage" onChange={() => {}} />)
    expect(screen.getByRole('combobox')).toHaveTextContent('Percentage')
  })
})

describe('ChartSettingsPopover', () => {
  const baseProps = {
    chartType: 'bar' as const,
    chartTypeOptions: ['bar', 'horizontalBar', 'pie'] as ChartType[],
    onChartTypeChange: () => {},
    valueMode: 'count' as const,
    onValueModeChange: () => {},
  }

  it('keeps the controls hidden until the settings button is clicked', () => {
    render(<ChartSettingsPopover {...baseProps} showValueMode />)

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /chart settings/i }))
    expect(screen.getAllByRole('combobox')).toHaveLength(2)
  })

  it('omits the value-mode control when showValueMode is false', () => {
    render(<ChartSettingsPopover {...baseProps} showValueMode={false} />)

    fireEvent.click(screen.getByRole('button', { name: /chart settings/i }))
    expect(screen.getAllByRole('combobox')).toHaveLength(1)
  })
})
