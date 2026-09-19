import type {
  MatrixCellStat,
  MatrixSubquestionStats,
  StatsQuestion,
  StatsResponse,
} from './types'

/**
 * Reads a single matrix cell value out of a response's answers, for the given
 * answer option / subquestion pair.
 */
export function getMatrixCellValue(
  response: StatsResponse,
  questionCode: string,
  optionCode: string,
  subquestionCode: string,
): unknown {
  const answer = response.answers[questionCode]
  return typeof answer === 'object' && answer !== null
    ? (answer as Record<string, Record<string, unknown>>)[subquestionCode]?.[
        optionCode
      ]
    : undefined
}

/**
 * Walks a matrix question's subquestions x answer options, delegating each
 * cell's aggregation to buildCell. Shared by all matrix stats aggregators
 * (boolean, number, ...) which only differ in how a cell is aggregated.
 */
export function buildMatrixSubquestionStats(
  question: StatsQuestion,
  buildCell: (
    option: NonNullable<StatsQuestion['answerOptions']>[number],
    subquestion: NonNullable<StatsQuestion['subquestions']>[number],
  ) => MatrixCellStat,
): MatrixSubquestionStats[] {
  const answerOptions = Array.isArray(question.answerOptions)
    ? question.answerOptions
    : []
  const subquestions = Array.isArray(question.subquestions)
    ? question.subquestions
    : []

  return subquestions.map((subquestion) => ({
    subquestionId: subquestion._id,
    subquestionCode: subquestion.code,
    subquestionText: subquestion.text,
    cellStats: answerOptions.map((option) => buildCell(option, subquestion)),
  }))
}
