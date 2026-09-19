import { ChartType, ChartValueMode } from '../SettingSurvey/SettingSurveyBase'
import {
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_MATRIX_NUMBER,
  QUESTION_TYPE_MATRIX_YES_NO,
  QUESTION_TYPE_MULTI_PART_NUMBER,
} from './attributeMeta/types'
import { isChoiceQuestionType, isMatrixQuestionType } from './Matrix'
import { isMultiPartStatsCompatibleType } from './MultiPart'
import { isRankingStatsCompatibleType } from './Ranking'

// Human-readable labels for the chart-type selector on the statistics page.
export const CHART_TYPE_LABELS: Record<ChartType, string> = {
  bar: 'Bar Chart',
  horizontalBar: 'Horizontal Bar',
  pie: 'Pie Chart',
  stackedBar: 'Stacked Bar',
  pieGrid: 'Pie Grid',
  averageRank: 'Average Rank',
}

// Bar orientations are always available; the first element is the default.
const BAR_ONLY: ChartType[] = ['bar', 'horizontalBar']

// Choice-shaped types whose option values within a subquestion/part sum to
// ~100%, so a 100% stacked bar and a per-subquestion pie grid are meaningful.
const GROUPED_PROPORTIONAL: ChartType[] = [
  'bar',
  'horizontalBar',
  'stackedBar',
  'pieGrid',
]

/**
 * The chart types offered on the statistics page for a given question type.
 *
 * The list is constrained so semantically wrong choices are never shown:
 * - a `pie` of averages (matrixNumber / multiPartNumber) makes no sense
 * - `stackedBar` / `pieGrid` need option values that sum to 100%, which rules
 *   out independent booleans (matrixCheckbox) and flat multi-select checkbox
 *
 * The first element is the default / fallback for an unset or now-invalid
 * stored value.
 */
export function getAvailableChartTypes(questionType: string): ChartType[] {
  // Averages — only bar orientations.
  if (
    questionType === QUESTION_TYPE_MATRIX_NUMBER ||
    questionType === QUESTION_TYPE_MULTI_PART_NUMBER
  ) {
    return BAR_ONLY
  }

  if (questionType === QUESTION_TYPE_MATRIX_YES_NO) {
    return GROUPED_PROPORTIONAL
  }

  // Remaining matrix types (matrixCheckbox and any non-stats-compatible ones).
  if (isMatrixQuestionType(questionType)) {
    return BAR_ONLY
  }

  // Multi-part choice types (yesNo / starRating / point5 / point10); number is
  // handled above.
  if (isMultiPartStatsCompatibleType(questionType)) {
    return GROUPED_PROPORTIONAL
  }

  // Flat multi-select checkbox: counts can exceed the response total, so a pie
  // would misrepresent the data.
  if (questionType === QUESTION_TYPE_CHECKBOX) {
    return BAR_ONLY
  }

  // Ranking: bar orientations plot the rank-position composition; stackedBar is
  // a per-option 100% rank profile; averageRank is a per-option mean-rank bar. A
  // pie is meaningless across rank positions.
  if (isRankingStatsCompatibleType(questionType)) {
    return ['bar', 'horizontalBar', 'stackedBar', 'averageRank']
  }

  // Flat single-choice types: a single distribution, pie is valid.
  if (isChoiceQuestionType(questionType)) {
    return ['bar', 'horizontalBar', 'pie']
  }

  return BAR_ONLY
}

// Labels for the count/percentage selector on the statistics page.
export const CHART_VALUE_MODE_LABELS: Record<ChartValueMode, string> = {
  count: 'Count',
  percentage: 'Percentage',
}

/**
 * Whether switching between counts and percentages changes what a chart plots.
 * Only the plain bar orientations do - `stackedBar` is always a 100% bar and
 * `pie` / `pieGrid` are proportional (identical geometry either way).
 */
export function chartTypeUsesValueMode(chartType: ChartType): boolean {
  return chartType === 'bar' || chartType === 'horizontalBar'
}

/**
 * Whether a question type has count/percentage data to toggle between.
 * Average-only types (matrixNumber, multiPartNumber) do not.
 */
export function questionTypeHasValueModeData(questionType: string): boolean {
  return (
    questionType !== QUESTION_TYPE_MATRIX_NUMBER &&
    questionType !== QUESTION_TYPE_MULTI_PART_NUMBER
  )
}
