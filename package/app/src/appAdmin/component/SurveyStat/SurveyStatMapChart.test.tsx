import { act, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

import React from 'react'

import { SurveyStatMapChart } from './SurveyStatMapChart'
import { SurveyStatChart } from './SurveyStatChart'
import { createResultsMap } from './resultsMap'
import type { MapStats, QuestionStats } from './model/api/SurveyStatsApi'

jest.mock('./resultsMap', () => ({ createResultsMap: jest.fn() }))

const mockCreateResultsMap = createResultsMap as jest.MockedFunction<
  typeof createResultsMap
>

const mapStats: MapStats = {
  points: [
    { lat: 51.507, lng: -0.128, count: 3 },
    { lat: 48.857, lng: 2.352, count: 1 },
  ],
  pinCount: 4,
  distinctPoints: 2,
  truncated: false,
  bounds: [48.857, -0.128, 51.507, 2.352],
}

const buildStat = (overrides: Partial<MapStats> = {}): QuestionStats => ({
  questionId: 'q1',
  questionCode: 'Q1',
  questionType: 'map',
  questionText: { en: 'Where?' },
  totalResponses: 5,
  optionStats: [],
  mapStats: { ...mapStats, ...overrides },
})

async function renderInAct(ui: React.ReactElement) {
  let result!: ReturnType<typeof render>
  await act(async () => {
    result = render(ui)
  })
  return result
}

describe('SurveyStatMapChart', () => {
  const destroy = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateResultsMap.mockResolvedValue({ destroy })
  })

  it('draws the map from the grouped points and cleans up', async () => {
    const stat = buildStat()
    const { unmount } = await renderInAct(
      <SurveyStatMapChart questionStat={stat} />,
    )

    await waitFor(() =>
      expect(mockCreateResultsMap).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        stat.mapStats,
      ),
    )
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
    unmount()
    expect(destroy).toHaveBeenCalled()
  })

  it('summarises the locations and lists the busiest places', async () => {
    await renderInAct(<SurveyStatMapChart questionStat={buildStat()} />)

    expect(screen.getByText(/4 locations in 2 places/)).toBeInTheDocument()
    expect(screen.getByText('51.507, -0.128')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('says when quieter places were left out', async () => {
    await renderInAct(
      <SurveyStatMapChart questionStat={buildStat({ truncated: true })} />,
    )

    expect(screen.getByText(/shows the 2 busiest places/)).toBeInTheDocument()
  })

  it('shows an empty state and builds no map when there are no pins', async () => {
    await renderInAct(
      <SurveyStatMapChart
        questionStat={buildStat({
          points: [],
          pinCount: 0,
          distinctPoints: 0,
          bounds: null,
        })}
      />,
    )

    expect(
      screen.getByText(/No locations have been chosen/),
    ).toBeInTheDocument()
    expect(mockCreateResultsMap).not.toHaveBeenCalled()
  })

  it('says so when the map cannot load', async () => {
    mockCreateResultsMap.mockRejectedValue(new Error('offline'))
    await renderInAct(<SurveyStatMapChart questionStat={buildStat()} />)

    expect(
      await screen.findByText('The map could not be loaded.'),
    ).toBeInTheDocument()
  })
})

describe('SurveyStatChart for a map question', () => {
  it('shows the map chart without the chart type settings', async () => {
    mockCreateResultsMap.mockResolvedValue({ destroy: jest.fn() })
    await renderInAct(
      <SurveyStatChart
        questionStat={buildStat()}
        questionCode="Q1"
        language="en"
      />,
    )

    expect(
      screen.getByRole('application', { name: 'Map of chosen locations' }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Chart settings')).toBeNull()
    await waitFor(() => expect(mockCreateResultsMap).toHaveBeenCalled())
  })
})
