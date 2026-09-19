import React from 'react'
import {
  Survey,
  ChartType,
  ChartValueMode,
  ATTRIBUTE_MATRIX_ORIENTATION,
  MATRIX_ORIENTATION_ANSWER_OPTIONS_ROWS,
  QUESTION_TYPE_MATRIX_NUMBER,
  QUESTION_TYPE_MATRIX_YES_NO,
} from 'veysur-common'

import type { QuestionStats, MatrixCellStat } from './model/api/SurveyStatsApi'
import {
  buildGroupedRows,
  buildSeriesKeys,
  chartColorAt,
  getLabel,
} from './chartUtils'
import { ChartLegend, GroupedBarChart, PieGridChart } from './chartComponents'
import { MatrixNumbersTable } from './MatrixNumbersTable'
import { MatrixYesNoBreakdown } from './MatrixYesNoBreakdown'

interface Props {
  questionStat: QuestionStats
  questionCode: string
  language: string
  survey?: Survey
  chartType: ChartType
  valueMode: ChartValueMode
}

export const SurveyStatMatrixChart: React.FC<Props> = ({
  questionStat,
  questionCode,
  language,
  survey,
  chartType,
  valueMode,
}) => {
  const question = survey?.elements.questions()?.getByCode(questionCode)
  const orientation =
    (question?.attributes?.[ATTRIBUTE_MATRIX_ORIENTATION] as string) ||
    MATRIX_ORIENTATION_ANSWER_OPTIONS_ROWS
  const isNumeric = questionStat.questionType === QUESTION_TYPE_MATRIX_NUMBER
  const isYesNo = questionStat.questionType === QUESTION_TYPE_MATRIX_YES_NO

  const subquestionStats = questionStat.matrixSubquestionStats || []
  const answerOptionCodes =
    subquestionStats[0]?.cellStats.map((cell) => cell.optionCode) || []

  const cellValue = (cell: MatrixCellStat | undefined) => {
    if (!cell) return 0
    if (isNumeric) return cell.average ?? 0
    return valueMode === 'percentage' ? cell.percentage : cell.count
  }

  // Stacked bars are always a 100% percentage bar, independent of `valueMode`.
  const cellPercentage = (cell: MatrixCellStat | undefined) =>
    cell?.percentage ?? 0

  const optionLabel = (optionCode: string) =>
    getLabel(
      subquestionStats[0]?.cellStats.find(
        (cell) => cell.optionCode === optionCode,
      )?.optionLabel,
      language,
      optionCode,
    )

  const subquestionLabel = (
    subquestionCode: string,
    subquestionText?: {
      [lang: string]: string
    },
  ) => getLabel(subquestionText, language, subquestionCode)

  const findCell = (subquestionCode: string, optionCode: string) =>
    subquestionStats
      .find((s) => s.subquestionCode === subquestionCode)
      ?.cellStats.find((c) => c.optionCode === optionCode)

  // Answer options and subquestions each as a colour/legend axis, indexed by
  // position so colours stay consistent across every rendering. `SeriesKey`
  // doubles as the `ChartLegend` item shape.
  const optionSeriesKeys = buildSeriesKeys(
    answerOptionCodes,
    (optionCode) => optionCode,
    optionLabel,
  )
  const subquestionSeriesKeys = buildSeriesKeys(
    subquestionStats,
    (s) => s.subquestionCode,
    (s) => subquestionLabel(s.subquestionCode, s.subquestionText),
  )

  // Numbers table (always shown, independent of chart type).
  const numbersTable = (
    <MatrixNumbersTable
      questionStat={questionStat}
      answerOptionCodes={answerOptionCodes}
      isNumeric={isNumeric}
      isYesNo={isYesNo}
      optionLabel={optionLabel}
      subquestionLabel={subquestionLabel}
    />
  )

  // --- matrixYesNo: per-cell Yes / No / not-answered breakdown ------------
  if (isYesNo && (chartType === 'pieGrid' || chartType === 'stackedBar')) {
    return (
      <MatrixYesNoBreakdown
        questionStat={questionStat}
        chartType={chartType}
        optionLabel={optionLabel}
        subquestionLabel={subquestionLabel}
        numbersTable={numbersTable}
      />
    )
  }

  // --- Pie grid: one pie per subquestion, slices = answer options ---------
  if (chartType === 'pieGrid') {
    return (
      <div className="space-y-4">
        <PieGridChart
          cells={subquestionStats.map((subquestion) => ({
            key: subquestion.subquestionCode,
            caption: subquestionLabel(
              subquestion.subquestionCode,
              subquestion.subquestionText,
            ),
            slices: answerOptionCodes.map((optionCode, index) => ({
              name: optionLabel(optionCode),
              value: cellPercentage(
                subquestion.cellStats.find((c) => c.optionCode === optionCode),
              ),
              fill: chartColorAt(index),
            })),
          }))}
        />
        <ChartLegend items={optionSeriesKeys} />
        {numbersTable}
      </div>
    )
  }

  // --- Stacked bar: subquestion rows, answer-option segments, 100% ---------
  if (chartType === 'stackedBar') {
    const chartData = buildGroupedRows({
      categories: subquestionStats,
      categoryKey: (s) => s.subquestionCode,
      categoryName: (s) =>
        subquestionLabel(s.subquestionCode, s.subquestionText),
      series: answerOptionCodes,
      seriesKey: (optionCode) => optionCode,
      value: (s, optionCode) =>
        cellPercentage(findCell(s.subquestionCode, optionCode)),
    })

    return (
      <div className="space-y-4">
        <GroupedBarChart
          data={chartData}
          seriesKeys={optionSeriesKeys}
          valueMode="percentage"
          horizontal
          stacked
        />
        <ChartLegend items={optionSeriesKeys} />
        {numbersTable}
      </div>
    )
  }

  // --- Grouped bar / horizontal bar (orientation-aware) -------------------
  const subquestionsAsSeries =
    orientation === MATRIX_ORIENTATION_ANSWER_OPTIONS_ROWS

  const chartData = subquestionsAsSeries
    ? buildGroupedRows({
        categories: answerOptionCodes,
        categoryKey: (optionCode) => optionCode,
        categoryName: (optionCode) => optionLabel(optionCode),
        series: subquestionStats,
        seriesKey: (s) => s.subquestionCode,
        value: (optionCode, s) =>
          cellValue(findCell(s.subquestionCode, optionCode)),
      })
    : buildGroupedRows({
        categories: subquestionStats,
        categoryKey: (s) => s.subquestionCode,
        categoryName: (s) =>
          subquestionLabel(s.subquestionCode, s.subquestionText),
        series: answerOptionCodes,
        seriesKey: (optionCode) => optionCode,
        value: (s, optionCode) =>
          cellValue(findCell(s.subquestionCode, optionCode)),
      })

  const seriesKeys = subquestionsAsSeries
    ? subquestionSeriesKeys
    : optionSeriesKeys

  return (
    <div className="space-y-4">
      <GroupedBarChart
        data={chartData}
        seriesKeys={seriesKeys}
        valueMode={valueMode}
        horizontal={chartType === 'horizontalBar'}
      />
      <ChartLegend items={seriesKeys} />
      {numbersTable}
    </div>
  )
}
