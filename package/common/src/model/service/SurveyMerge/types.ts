import { CompatibilityResult } from '../SurveyCompare/types'

export interface MergeOptions {
  dryRun?: boolean
}

export interface MergeResult {
  success: boolean
  sourceSnapshotId: string
  targetSnapshotId: string
  targetPublicationId: string
  stats: MergeStatistics
  compatibility: CompatibilityResult
  preview?: MergePreview
}

export interface MergeStatistics {
  sourceResponseCount: number
  responsesCreated: number
  responsesAlreadyMerged: number
  responsesSkippedParticipantDuplicate: number
  answersTransferred: number
  answersSkipped: number
  answerSkipReasons: Record<string, number> // { missing_question: 5, incompatible_type: 2 }
}

export interface MergePreview {
  sampleMappings: ResponseMapping[]
}

export interface ResponseMapping {
  originalAnswers: Record<string, unknown>
  mappedAnswers: Record<string, unknown>
  skippedAnswers: AnswerSkipDetail[]
}

export interface AnswerSkipDetail {
  questionCode: string
  reason:
    | 'missing_question'
    | 'incompatible_type'
    | 'missing_option'
    | 'missing_subquestion'
    | 'exceeds_maximum'
  originalValue: unknown
}
