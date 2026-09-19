import { PredefinedAnswerOption, QuestionTypeDefinition } from './types'
import { yesNoDefinition } from './yesNo'
import { starRatingDefinition } from './starRating'
import { point5Definition } from './point5'
import { point10Definition } from './point10'

export { PredefinedAnswerOption, QuestionTypeDefinition }
export { getPointScaleCount } from './pointScale'

const questionTypeDefinitions = new Map<string, QuestionTypeDefinition>()

// Cache for `getAllPredefinedAnswerOptionCodes` - invalidated only by
// `registerQuestionTypeDefinition`, the sole way the registry can change.
let allPredefinedAnswerOptionCodesCache: string[] | undefined

/**
 * Registers a question type's definition. Built-in types register
 * themselves below at module load; a future dynamically-loaded custom
 * question type can call this the same way to supply its own metadata
 * (including its own predefined answer options) without editing this file.
 */
export function registerQuestionTypeDefinition(
  definition: QuestionTypeDefinition,
): void {
  questionTypeDefinitions.set(definition.type, definition)
  allPredefinedAnswerOptionCodesCache = undefined
}

export function getQuestionTypeDefinition(
  type: string,
): QuestionTypeDefinition | undefined {
  return questionTypeDefinitions.get(type)
}

export function getPredefinedAnswerOptions(
  type: string,
): PredefinedAnswerOption[] | undefined {
  return questionTypeDefinitions.get(type)?.predefinedAnswerOptions
}

export function questionTypeHasPredefinedAnswerOptions(type: string): boolean {
  return !!getPredefinedAnswerOptions(type)?.length
}

/**
 * All predefined answer option codes across every currently-registered
 * question type definition (built-in and any dynamically-registered custom
 * types). Cached after first computation - the registry only ever changes
 * via `registerQuestionTypeDefinition`, which invalidates the cache, so a
 * type registered after this module has loaded is still picked up.
 */
export function getAllPredefinedAnswerOptionCodes(): string[] {
  if (!allPredefinedAnswerOptionCodesCache) {
    const codes = new Set<string>()
    for (const definition of questionTypeDefinitions.values()) {
      for (const option of definition.predefinedAnswerOptions ?? []) {
        codes.add(option.code)
      }
    }
    allPredefinedAnswerOptionCodesCache = Array.from(codes)
  }
  return allPredefinedAnswerOptionCodesCache
}

registerQuestionTypeDefinition(yesNoDefinition)
registerQuestionTypeDefinition(starRatingDefinition)
registerQuestionTypeDefinition(point5Definition)
registerQuestionTypeDefinition(point10Definition)
