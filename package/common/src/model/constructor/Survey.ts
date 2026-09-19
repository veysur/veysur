import { SurveyBase } from './Survey/SurveyBase'
import { GetterMethods } from './Survey/mixin/GetterMethods'
import { SurveyCoreMethods } from './Survey/mixin/SurveyCoreMethods'
import { SettingSurveyCoreMethods } from './SettingSurvey/mixin/SettingSurveyCoreMethods'
import { SectionMethods } from './Survey/mixin/SectionMethods'
import { PublishPrepMethods } from './Survey/mixin/PublishPrepMethods'
import { QuestionMethods } from './Survey/mixin/QuestionMethods'
import { ContentMethods } from './Survey/mixin/ContentMethods'
import { SubquestionMethods } from './Survey/mixin/SubquestionMethods'
import { AnswerOptionMethods } from './Survey/mixin/AnswerOptionMethods'
import { LanguageMethods } from './SettingSurvey/mixin/LanguageMethods'
import { PresentationMethods } from './SettingSurvey/mixin/PresentationMethods'
import { StatsMethods } from './SettingSurvey/mixin/StatsMethods'
import { ParticipantMethods } from './SettingSurvey/mixin/ParticipantMethods'
import { DataMethods } from './SettingSurvey/mixin/DataMethods'
import { AccessMethods } from './SettingSurvey/mixin/AccessMethods'
import { DataPolicyMethods } from './SettingSurvey/mixin/DataPolicyMethods'
import { LegalNoticeMethods } from './SettingSurvey/mixin/LegalNoticeMethods'
import { ScheduleMethods } from './SettingSurvey/mixin/ScheduleMethods'
import { NotifyMethods } from './SettingSurvey/mixin/NotifyMethods'
import { ContentFormatMethods } from './SettingSurvey/mixin/ContentFormatMethods'
import { WelcomeThankYouSectionMethods } from './Survey/mixin/WelcomeThankYouSectionMethods'
import { SurveySection } from './Survey/SurveySection'
import { SurveyQuestion } from './Survey/SurveyQuestion'
import { SurveyContent } from './Survey/SurveyContent'
import { SurveyAnswerOption } from './Survey/SurveyAnswerOption'
import { SurveySubquestion } from './Survey/SurveySubquestion'
import { SurveyInterface } from './Survey/SurveyInterface'

// Re-export the Survey-specific mixin components
export * from './Survey/index'

/**
 * MIXIN COMPOSITION PATTERN:
 *
 * The Survey class is built using a functional mixin pattern to compose behavior
 * from multiple sources while maintaining immutability. Each mixin function takes
 * a base class and returns an extended class with additional methods.
 *
 * Mixins used:
 * - Base - Core data structure and immutable instance creation
 * - CoreMethods - Basic survey operations (update, sort)
 * - SectionMethods - Section management operations
 * - PublishPrepMethods - Publish preparation operations
 * - QuestionMethods - Question management operations
 * - SubquestionMethods - Subquestion management operations
 * - AnswerOptionMethods - Answer option management operations
 * - LanguageMethods - Language configuration operations
 * - PresentationMethods - Presentation settings operations
 * - StatsMethods - Stats chart preferences operations
 * - ParticipantMethods - Participant settings operations
 * - DataMethods - Data tracking settings operations
 * - DataPolicyMethods - Data policy settings operations
 * - LegalNoticeMethods - Legal notice settings operations
 * - ScheduleMethods - Publish schedule settings operations
 * - NotifyMethods - Notification settings operations
 * - WelcomeThankYouSectionMethods - Welcome / thank-you section operations
 *   (plus @deprecated updateWelcomeMessage / updateThankYou* aliases)
 * - AccessMethods - Access control settings operations
 * - ContentFormatMethods - Content format/sanitization settings operations
 * - ContentMethods - Content element (kind: 'content') management operations
 *
 * IMMUTABILITY PATTERN:
 *
 * All operations that modify survey state return new instances rather than
 * mutating existing ones. This is achieved through:
 *
 * - newInstance() method in Base that creates new instances with changes
 * - Smart object reuse - unchanged collections/objects are reused between instances
 * - Conditional instance creation - if no changes occur, the same instance is returned
 * - Collection immutability - all collection operations return new collection instances
 *
 * Example immutability flow:
 * survey.updateTitle('New Title')
 * → creates new L10n instance with updated title
 * → calls newInstance() with { title: newL10n }
 * → returns new Survey instance with updated title, reusing all other objects
 */
const SurveyImpl = ContentFormatMethods(
  AccessMethods(
    WelcomeThankYouSectionMethods(
      NotifyMethods(
        ScheduleMethods(
          LegalNoticeMethods(
            DataPolicyMethods(
              DataMethods(
                ParticipantMethods(
                  StatsMethods(
                    PresentationMethods(
                      LanguageMethods(
                        AnswerOptionMethods(
                          SubquestionMethods(
                            ContentMethods(
                              QuestionMethods(
                                PublishPrepMethods(
                                  SectionMethods(
                                    SurveyCoreMethods(
                                      GetterMethods(
                                        SettingSurveyCoreMethods(SurveyBase),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  ),
)

/**
 * Survey class - Immutable survey data structure with composed functionality
 *
 * This class combines data structure (Base) with behavioral mixins to create
 * a fully-featured survey model that maintains immutability across all operations.
 * All methods that modify state return new Survey instances.
 */
export class Survey extends SurveyImpl implements SurveyInterface {}

// Type definitions
export type SurveyEntity =
  | Survey
  | SurveySection
  | SurveyQuestion
  | SurveyContent
  | SurveyAnswerOption
  | SurveySubquestion

/**
 * QuestionType is now defined in Survey/attributeMeta.ts (single source of truth)
 * and re-exported through Survey/index.ts
 * @see Survey/attributeMeta.ts for the canonical definition
 */
export type { QuestionType } from './Survey/attributeMeta'

export interface L10ns {
  [key: string]: string
}
