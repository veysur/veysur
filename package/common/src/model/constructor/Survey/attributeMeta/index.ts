// Re-export types and constants
export * from './types'
export * from './constants'
export * from './helpers'
export * from './reservedEntityCodes'

// Import all attribute metadata
import { surveyTitleMeta } from './attributes/surveyTitle'
import { surveyPresentationTitleMeta } from './attributes/surveyPresentationTitle'
import { surveyPresentationWelcomeMessageMeta } from './attributes/surveyPresentationWelcomeMessage'
import { surveyThankYouLinkUrlMeta } from './attributes/surveyThankYouLinkUrl'
import { surveyThankYouLinkTextMeta } from './attributes/surveyThankYouLinkText'
import { surveyThankYouLinkShowMeta } from './attributes/surveyThankYouLinkShow'
import { surveyThankYouRedirectEndMeta } from './attributes/surveyThankYouRedirectEnd'
import { entityCodeMeta } from './attributes/entityCode'
import { questionTypeMeta } from './attributes/questionType'
import { questionRequiredMeta } from './attributes/questionRequired'
import { questionInputSizeMeta } from './attributes/questionInputSize'
import { questionLengthMinMaxMeta } from './attributes/questionLengthMinMax'
import { choiceMinMaxMeta } from './attributes/choiceMinMax'
import { choiceOtherMeta } from './attributes/choiceOther'
import { choiceRandomiseMeta } from './attributes/choiceRandomise'
import { questionNumberMinMaxMeta } from './attributes/questionNumberMinMax'
import { questionNumberNegAllowedMeta } from './attributes/questionNumberNegAllowed'
import { conditionMeta } from './attributes/condition'
import { matrixOrientationMeta } from './attributes/matrixOrientation'
import { columnsMeta } from './attributes/columns'
import { fileUploadOptionsMeta } from './attributes/fileUploadOptions'

/**
 * Central registry of all attribute metadata
 * This maintains backward compatibility with the previous monolithic attributeMeta.ts
 */
export const attributesMetadata = [
  surveyTitleMeta,
  surveyPresentationTitleMeta,
  surveyPresentationWelcomeMessageMeta,
  surveyThankYouLinkUrlMeta,
  surveyThankYouLinkTextMeta,
  surveyThankYouLinkShowMeta,
  surveyThankYouRedirectEndMeta,
  entityCodeMeta,
  questionTypeMeta,
  questionRequiredMeta,
  questionInputSizeMeta,
  questionLengthMinMaxMeta,
  choiceMinMaxMeta,
  choiceOtherMeta,
  choiceRandomiseMeta,
  questionNumberMinMaxMeta,
  questionNumberNegAllowedMeta,
  matrixOrientationMeta,
  conditionMeta,
  columnsMeta,
  fileUploadOptionsMeta,
]

// Re-export individual metadata for direct access
export {
  surveyTitleMeta,
  surveyPresentationTitleMeta,
  surveyPresentationWelcomeMessageMeta,
  surveyThankYouLinkUrlMeta,
  surveyThankYouLinkTextMeta,
  surveyThankYouLinkShowMeta,
  surveyThankYouRedirectEndMeta,
  entityCodeMeta,
  questionTypeMeta,
  questionRequiredMeta,
  questionInputSizeMeta,
  questionLengthMinMaxMeta,
  choiceMinMaxMeta,
  choiceOtherMeta,
  choiceRandomiseMeta,
  questionNumberMinMaxMeta,
  questionNumberNegAllowedMeta,
  matrixOrientationMeta,
  conditionMeta,
  columnsMeta,
  fileUploadOptionsMeta,
}
