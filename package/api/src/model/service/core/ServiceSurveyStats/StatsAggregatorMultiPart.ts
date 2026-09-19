import {
  QUESTION_TYPE_YES_NO,
  QUESTION_TYPE_STAR_RATING,
  QUESTION_TYPE_POINT_5,
  QUESTION_TYPE_POINT_10,
  QUESTION_TYPE_NUMBER,
  getMultiPartDefaultSubquestionType,
} from 'veysur-common'

import type {
  QuestionStats,
  StatsQuestion,
  StatsResponse,
  MultiPartStat,
} from './types'
import { getMultiPartValue } from './multiPartStatsUtils'
import { StatsAggregatorYesNo } from './StatsAggregatorYesNo'
import { StatsAggregatorStarRating } from './StatsAggregatorStarRating'
import { StatsAggregatorPoint5 } from './StatsAggregatorPoint5'
import { StatsAggregatorPoint10 } from './StatsAggregatorPoint10'

type PartAggregator = {
  aggregate: (
    question: StatsQuestion,
    responses: StatsResponse[],
    totalResponses: number,
  ) => QuestionStats
}

const PART_AGGREGATORS: Record<string, PartAggregator> = {
  [QUESTION_TYPE_YES_NO]: StatsAggregatorYesNo,
  [QUESTION_TYPE_STAR_RATING]: StatsAggregatorStarRating,
  [QUESTION_TYPE_POINT_5]: StatsAggregatorPoint5,
  [QUESTION_TYPE_POINT_10]: StatsAggregatorPoint10,
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  const sum = values.reduce((acc, value) => acc + value, 0)
  return Math.round((sum / values.length) * 10) / 10
}

/**
 * Aggregates Multi-Part questions: every part shares the same enforced type
 * (fixed at question creation, see MultiPart.ts), so each part is treated as
 * a standalone question of that type, reusing the same per-type aggregators
 * used for the equivalent standalone question (Yes/No, Star Rating, 5-Point,
 * 10-Point). Multi-Part Number parts get a numeric average, mirroring
 * `StatsAggregatorMatrixNumber`. Multi-Part Text is not stats-compatible
 * (see `isMultiPartStatsCompatibleType`) and never reaches this aggregator.
 */
export class StatsAggregatorMultiPart {
  static aggregate(
    question: StatsQuestion,
    responses: StatsResponse[],
    totalResponses: number,
  ): QuestionStats {
    const parts = Array.isArray(question.subquestions)
      ? question.subquestions
      : []
    const partType = getMultiPartDefaultSubquestionType(question.type)

    const multiPartStats: MultiPartStat[] = parts.map((part) => {
      const partResponses: StatsResponse[] = responses.map((response) => ({
        answers: {
          [part.code]: getMultiPartValue(response, question.code, part.code),
        },
      }))

      const aggregator = PART_AGGREGATORS[partType]
      if (aggregator) {
        const partQuestion: StatsQuestion = {
          _id: part._id,
          code: part.code,
          type: partType,
          text: part.text,
        }
        const partStats = aggregator.aggregate(
          partQuestion,
          partResponses,
          totalResponses,
        )
        return {
          partId: part._id,
          partCode: part.code,
          partText: part.text,
          partType,
          optionStats: partStats.optionStats,
        }
      }

      if (partType === QUESTION_TYPE_NUMBER) {
        const values = partResponses
          .map((r) => r.answers[part.code])
          .filter(
            (value): value is number =>
              typeof value === 'number' && !Number.isNaN(value),
          )
        return {
          partId: part._id,
          partCode: part.code,
          partText: part.text,
          partType,
          optionStats: [],
          average: average(values),
        }
      }

      return {
        partId: part._id,
        partCode: part.code,
        partText: part.text,
        partType,
        optionStats: [],
      }
    })

    return {
      questionId: question._id,
      questionCode: question.code,
      questionType: question.type,
      questionText: question.text,
      totalResponses: responses.length,
      optionStats: [],
      multiPartStats,
    }
  }
}
