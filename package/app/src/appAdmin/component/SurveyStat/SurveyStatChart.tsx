import React from 'react'
import { PieChart, Pie, Cell } from 'recharts'
import {
  Survey,
  ChartType,
  ChartValueMode,
  getAvailableChartTypes,
  chartTypeUsesValueMode,
  questionTypeHasValueModeData,
  isMatrixQuestionType,
  isMultiPartStatsCompatibleType,
  isRankingStatsCompatibleType,
} from 'veysur-common'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from 'component/shadcn/chart'

import type { QuestionStats } from './model/api/SurveyStatsApi'
import { SurveyStatMatrixChart } from './SurveyStatMatrixChart'
import { SurveyStatMultiPartChart } from './SurveyStatMultiPartChart'
import { SurveyStatRankingChart } from './SurveyStatRankingChart'
import {
  buildConfigFromSeries,
  buildOptionSeries,
  clampChartType,
  getLabel,
} from './chartUtils'
import {
  ChartLegend,
  ChartSettingsPopover,
  DistributionBarChart,
  StatSummaryGrid,
} from './chartComponents'
import { useOptimisticSetting } from './hook'

interface Props {
  questionStat: QuestionStats
  questionCode: string
  language: string
  survey?: Survey
  onChartTypeChange?: (questionCode: string, chartType: ChartType) => void
  onValueModeChange?: (questionCode: string, valueMode: ChartValueMode) => void
}

/**
 * Resolve the chart type to render: the optimistic local choice if one is
 * pending, else the saved value, clamped to the set this question type
 * supports (a stored value can be stale after a question-type change).
 */
export function resolveChartType(
  saved: ChartType | null | undefined,
  local: ChartType | null,
  available: ChartType[],
): ChartType {
  return clampChartType(local || saved, available)
}

/**
 * Resolve the value mode (count vs percentage). Defaults to `count` when
 * nothing is saved.
 */
export function resolveValueMode(
  saved: ChartValueMode | null | undefined,
  local: ChartValueMode | null,
): ChartValueMode {
  return local || saved || 'count'
}

/**
 * The flat single-distribution chart (pie or bar) plus its legend and
 * key-figure grid, used for choice question types that have no matrix /
 * multi-part / ranking axis of their own.
 */
const FlatOptionChart: React.FC<{
  questionStat: QuestionStats
  language: string
  chartType: ChartType
  valueMode: ChartValueMode
}> = ({ questionStat, language, chartType, valueMode }) => {
  const chartData = buildOptionSeries(questionStat.optionStats, language)
  const chartConfig = buildConfigFromSeries(
    chartData.map((datum) => ({
      key: datum.key,
      label: datum.name,
      color: datum.fill,
    })),
  )

  return (
    <>
      {chartType === 'pie' ? (
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) =>
                `${name}: ${percentage.toFixed(1)}%`
              }
              outerRadius={100}
              dataKey="count"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
      ) : (
        <DistributionBarChart
          data={chartData}
          dataKey={valueMode}
          config={chartConfig}
          valueMode={valueMode}
          horizontal={chartType === 'horizontalBar'}
        />
      )}

      <ChartLegend
        items={chartData.map((item) => ({
          label: item.name,
          color: item.fill,
        }))}
      />

      <StatSummaryGrid
        items={questionStat.optionStats.map((option) => ({
          key: option.optionId,
          label: getLabel(option.optionLabel, language, option.optionCode),
          value: `${option.count} (${option.percentage.toFixed(1)}%)`,
        }))}
      />
    </>
  )
}

export const SurveyStatChart: React.FC<Props> = ({
  questionStat,
  questionCode,
  language,
  survey,
  onChartTypeChange,
  onValueModeChange,
}) => {
  const available = getAvailableChartTypes(questionStat.questionType)
  const savedQuestion = survey?.stats?.questions?.[questionCode]

  // Optimistic local state - tracks pending changes before the patch lands.
  const [localChartType, handleChartTypeChange] =
    useOptimisticSetting<ChartType>(savedQuestion?.chartType, (next) =>
      onChartTypeChange?.(questionCode, next),
    )
  const [localValueMode, handleValueModeChange] =
    useOptimisticSetting<ChartValueMode>(savedQuestion?.valueMode, (next) =>
      onValueModeChange?.(questionCode, next),
    )

  const chartType = resolveChartType(
    savedQuestion?.chartType,
    localChartType,
    available,
  )
  const valueMode = resolveValueMode(savedQuestion?.valueMode, localValueMode)

  const showValueMode =
    chartTypeUsesValueMode(chartType) &&
    questionTypeHasValueModeData(questionStat.questionType)

  const controls = (
    <ChartSettingsPopover
      chartType={chartType}
      chartTypeOptions={available}
      onChartTypeChange={handleChartTypeChange}
      valueMode={valueMode}
      showValueMode={showValueMode}
      onValueModeChange={handleValueModeChange}
    />
  )

  const questionType = questionStat.questionType

  let chart: React.ReactNode
  if (isMatrixQuestionType(questionType)) {
    chart = (
      <SurveyStatMatrixChart
        questionStat={questionStat}
        questionCode={questionCode}
        language={language}
        survey={survey}
        chartType={chartType}
        valueMode={valueMode}
      />
    )
  } else if (isMultiPartStatsCompatibleType(questionType)) {
    chart = (
      <SurveyStatMultiPartChart
        questionStat={questionStat}
        language={language}
        chartType={chartType}
        valueMode={valueMode}
      />
    )
  } else if (isRankingStatsCompatibleType(questionType)) {
    chart = (
      <SurveyStatRankingChart
        questionStat={questionStat}
        language={language}
        chartType={chartType}
        valueMode={valueMode}
      />
    )
  } else {
    chart = (
      <FlatOptionChart
        questionStat={questionStat}
        language={language}
        chartType={chartType}
        valueMode={valueMode}
      />
    )
  }

  return (
    <div className="space-y-4">
      {controls}
      {chart}
    </div>
  )
}
