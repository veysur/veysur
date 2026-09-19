import { SurveyParticipantAttributeDefinition } from '../../constructor/SurveyParticipantAttribute'
import { SurveyParticipantAttributeLanguageData } from '../../constructor/SurveyParticipantAttributeLanguage'

export type ChangeType = 'added' | 'removed' | 'modified' | 'reordered'

export interface FieldDifference {
  path: string
  type: ChangeType
  oldValue?: unknown
  newValue?: unknown
}

export interface L10nDifference {
  path: string
  type: ChangeType
  language: string
  oldValue?: string
  newValue?: string
}

export interface ParticipantAttributeDifference {
  type: ChangeType
  name: string
  oldData?: SurveyParticipantAttributeDefinition
  newData?: SurveyParticipantAttributeDefinition
}

export interface ParticipantAttributeL10nDifference {
  type: ChangeType
  name: string
  language: string
  field: 'label' | 'description'
  oldValue?: string
  newValue?: string
}

export type ParticipantAttributeLanguageDoc = {
  languageCode: string
  data: Record<string, SurveyParticipantAttributeLanguageData>
}

export interface CollectionDifference {
  path: string
  type: ChangeType
  itemId: string
  itemType:
    | 'group'
    | 'question'
    | 'subquestion'
    | 'answerOption'
    | 'content'
    | 'section'
  oldData?: unknown
  newData?: unknown
  differences?: FieldDifference[]
}

// Incompatibility reason codes
export type IncompatibilityReason =
  | 'missing_question' // Question in survey-a doesn't exist in survey-b
  | 'incompatible_type' // Question type changed in incompatible way
  | 'missing_answer_option' // Answer option in survey-a removed in survey-b
  | 'missing_subquestion' // Subquestion in survey-a removed in survey-b
  | 'incompatible_required_constraint' // Target requires answer but source didn't
  | 'incompatible_choice_constraint' // Target has stricter min/max choices
  | 'incompatible_length_constraint' // Target has stricter min/max length
  | 'incompatible_number_constraint' // Target has stricter number constraints
  | 'incompatible_negative_constraint' // Target disallows negatives but source allowed
  | 'incompatible_subquestion_type' // Subquestion type changed (matrix cell data may be invalid)
  | 'missing_participant_attribute' // Custom participant attribute in survey-a doesn't exist in survey-b

// Details about a specific incompatibility
export interface IncompatibilityDetail {
  path: string // e.g., "questions[Q1]" or "questions[Q1].answerOptions[A1]"
  reason: IncompatibilityReason
  itemType: 'question' | 'answerOption' | 'subquestion' | 'participantAttribute'
  itemCode: string // The code of the missing/incompatible item
  surveyAType?: string // For type incompatibilities, the type in survey-a
  surveyBType?: string // For type incompatibilities, the type in survey-b
  attributeName?: string // For attribute incompatibilities, the attribute name
  sourceAttributeValue?: unknown // For attribute incompatibilities, source value
  targetAttributeValue?: unknown // For attribute incompatibilities, target value
  message?: string // Human-readable description
}

// Compatibility result structure
export interface CompatibilityResult {
  isCompatible: boolean
  incompatibilities: IncompatibilityDetail[]
  summary: {
    totalIncompatibilities: number
    missingQuestions: number
    incompatibleTypes: number
    missingAnswerOptions: number
    missingSubquestions: number
    incompatibleSubquestionTypes: number
    incompatibleAttributes: number
    incompatibleRequiredConstraints: number
    incompatibleChoiceConstraints: number
    incompatibleLengthConstraints: number
    incompatibleNumberConstraints: number
    missingParticipantAttributes: number
  }
}

export interface SurveyComparisonResult {
  isEquivalent: boolean
  isCompatible: boolean
  compatibility?: CompatibilityResult
  differences: {
    fields: FieldDifference[]
    l10n: L10nDifference[]
    collections: CollectionDifference[]
    participantAttributes: ParticipantAttributeDifference[]
    participantAttributesL10n: ParticipantAttributeL10nDifference[]
    reordering: {
      groups?: { oldOrder: string[]; newOrder: string[] }
      questions?: { oldOrder: string[]; newOrder: string[] }
    }
  }
  summary: {
    totalChanges: number
    addedItems: number
    removedItems: number
    modifiedItems: number
    reorderedCollections: number
  }
}
