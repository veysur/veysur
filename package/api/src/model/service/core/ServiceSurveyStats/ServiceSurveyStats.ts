import { Service, ServerErrorNotFound } from '@datacapy/server'
import {
  QUESTION_TYPE_YES_NO,
  QUESTION_TYPE_STAR_RATING,
  QUESTION_TYPE_POINT_5,
  QUESTION_TYPE_POINT_10,
  QUESTION_TYPE_MATRIX_CHECKBOX,
  QUESTION_TYPE_MATRIX_YES_NO,
  QUESTION_TYPE_MATRIX_NUMBER,
  isChoiceQuestionType,
  isMatrixStatsCompatibleType,
  isMultiPartStatsCompatibleType,
  isRankingStatsCompatibleType,
} from 'veysur-common'

import type {
  RepoSurveyResponse,
  RepoSurveySnapshotPartial,
  RepoSurveySnapshot,
  RepoSurveyLanguageSnapshot,
  RepoSurveyParticipant,
  ServiceProject,
} from 'model'
import { mergeSurveyLanguageSnapshots } from 'model/common'

import type {
  QuestionStats,
  StatsQuestion,
  StatsResponse,
  SurveyStatsResult,
} from './types'
import { StatsQueryBuilder } from './StatsQueryBuilder'
import { StatsAggregatorYesNo } from './StatsAggregatorYesNo'
import { StatsAggregatorStarRating } from './StatsAggregatorStarRating'
import { StatsAggregatorPoint5 } from './StatsAggregatorPoint5'
import { StatsAggregatorPoint10 } from './StatsAggregatorPoint10'
import { StatsAggregatorArray } from './StatsAggregatorArray'
import { StatsAggregatorMatrixBoolean } from './StatsAggregatorMatrixBoolean'
import { StatsAggregatorMatrixNumber } from './StatsAggregatorMatrixNumber'
import { StatsAggregatorMultiPart } from './StatsAggregatorMultiPart'
import { StatsAggregatorRanking } from './StatsAggregatorRanking'
import { contextForProject } from 'common'

export class ServiceSurveyStats extends Service {
  constructor() {
    super({
      name: 'surveyStats',
    })
  }

  async getStats({
    surveyId,
    snapshotId,
    projectId,
    publicationId,
    completed,
    startDate,
    endDate,
    dateField,
    search,
  }): Promise<SurveyStatsResult> {
    const context = contextForProject(projectId)

    // 1. Fetch snapshot to get question definitions
    const repoSnapshot = this.getRepo<RepoSurveySnapshotPartial>(
      'surveySnapshotPartial',
    )
    const snapshot = await repoSnapshot.findOne(
      {
        _id: snapshotId,
        surveyId,
      },
      { context },
    )

    if (!snapshot) {
      throw new ServerErrorNotFound('Survey snapshot not found')
    }

    // 2. Fetch snapshot data with full survey questions
    const repoSnapshotData = this.getRepo<RepoSurveySnapshot>('surveySnapshot')
    const snapshotData = await repoSnapshotData.findOne(
      {
        snapshotId: snapshot._id,
      },
      { context },
    )

    if (!snapshotData || !snapshotData.survey) {
      throw new ServerErrorNotFound('Survey snapshot data not found')
    }

    // Merge every language the snapshot has, not just the default: the stats
    // page renders question/option text in whichever survey language the
    // viewer selects, so `questionText`/`optionLabel` must carry them all.
    const defaultLang = snapshot.surveyPartial?.language?.default
    const langCodes = snapshot.surveyPartial?.language?.options?.length
      ? snapshot.surveyPartial.language.options
      : [defaultLang].filter(Boolean)
    const repoSurveyLanguageSnapshot = this.getRepo<RepoSurveyLanguageSnapshot>(
      'surveyLanguageSnapshot',
    )
    const survey = await mergeSurveyLanguageSnapshots(
      repoSurveyLanguageSnapshot,
      snapshotData.survey,
      snapshot._id,
      langCodes,
      context,
    )

    // 3. Build query for responses
    const repoResponse = this.getRepo<RepoSurveyResponse>('surveyResponse')
    const repoParticipant =
      this.getRepo<RepoSurveyParticipant>('surveyParticipant')

    let timezone: string | undefined
    if (startDate || endDate) {
      const project =
        await this.getService<ServiceProject>('project').getById(projectId)
      timezone = project?.timezone
    }

    const { query, skipValidation } = await StatsQueryBuilder.build(
      {
        surveyId,
        snapshotId,
        publicationId,
        completed,
        startDate,
        endDate,
        dateField,
        timezone,
        search,
      },
      repoParticipant,
      context,
    )

    // 4. Get total response count
    const totalResponses = await repoResponse.count(query, {
      context,
      skipValidation,
    })

    // 5. Process only choice questions and stats-compatible matrix questions
    const questionStats: QuestionStats[] = []

    // `mergeSurveyLanguageSnapshots` returns a constructed `Survey` (the snapshot
    // blob is hydrated via `$construct: 'Survey'` on read), so `survey.elements.questions()`
    // is the filtered `SurveyElementCollection` view — a `Collection extends Array`,
    // hence `Array.isArray` is true.
    const questions: StatsQuestion[] = Array.isArray(
      survey.elements.questions(),
    )
      ? survey.elements.questions()
      : []

    for (const question of questions) {
      // Content elements are interleaved with questions in the element list but
      // carry no answers — never a stats column. `survey.elements.questions()`
      // already excludes them, so nothing extra is needed here.
      if (
        !isChoiceQuestionType(question.type) &&
        !isMatrixStatsCompatibleType(question.type) &&
        !isMultiPartStatsCompatibleType(question.type) &&
        !isRankingStatsCompatibleType(question.type)
      ) {
        continue
      }

      // Fetch responses for this question (only `answers` is populated by
      // the `select` projection below)
      const rawResponses = await repoResponse.find(query, {
        context,
        select: { answers: 1 },
        limit: 100000,
        skipValidation,
      })
      const responses: StatsResponse[] = rawResponses.map((r) => ({
        answers: r.answers as Record<string, unknown>,
      }))

      if (question.type === QUESTION_TYPE_YES_NO) {
        questionStats.push(
          StatsAggregatorYesNo.aggregate(question, responses, totalResponses),
        )
      } else if (question.type === QUESTION_TYPE_STAR_RATING) {
        questionStats.push(
          StatsAggregatorStarRating.aggregate(
            question,
            responses,
            totalResponses,
          ),
        )
      } else if (question.type === QUESTION_TYPE_POINT_5) {
        questionStats.push(
          StatsAggregatorPoint5.aggregate(question, responses, totalResponses),
        )
      } else if (question.type === QUESTION_TYPE_POINT_10) {
        questionStats.push(
          StatsAggregatorPoint10.aggregate(question, responses, totalResponses),
        )
      } else if (
        question.type === QUESTION_TYPE_MATRIX_CHECKBOX ||
        question.type === QUESTION_TYPE_MATRIX_YES_NO
      ) {
        questionStats.push(
          StatsAggregatorMatrixBoolean.aggregate(
            question,
            responses,
            totalResponses,
          ),
        )
      } else if (question.type === QUESTION_TYPE_MATRIX_NUMBER) {
        questionStats.push(
          StatsAggregatorMatrixNumber.aggregate(
            question,
            responses,
            totalResponses,
          ),
        )
      } else if (isMultiPartStatsCompatibleType(question.type)) {
        questionStats.push(
          StatsAggregatorMultiPart.aggregate(
            question,
            responses,
            totalResponses,
          ),
        )
      } else if (isRankingStatsCompatibleType(question.type)) {
        questionStats.push(
          StatsAggregatorRanking.aggregate(question, responses, totalResponses),
        )
      } else {
        questionStats.push(
          StatsAggregatorArray.aggregate(question, responses, totalResponses),
        )
      }
    }

    return {
      surveyId,
      snapshotId,
      totalResponses,
      filter: {
        publicationId,
        completed,
        startDate,
        endDate,
        dateField,
      },
      questionStats,
    }
  }
}

export default ServiceSurveyStats
