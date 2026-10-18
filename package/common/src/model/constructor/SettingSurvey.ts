import { SettingSurveyBase } from './SettingSurvey/SettingSurveyBase'
import { SettingSurveyCoreMethods } from './SettingSurvey/mixin/SettingSurveyCoreMethods'
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
import { SettingSurveyInterface } from './SettingSurvey/SettingSurveyInterface'

// Re-export the components
export * from './SettingSurvey/index'

/**
 * MIXIN COMPOSITION PATTERN:
 *
 * The SettingSurvey class is built using a functional mixin pattern to compose behavior
 * from multiple sources while maintaining immutability. Each mixin function takes
 * a base class and returns an extended class with additional methods.
 *
 * Mixins used:
 * - Base - Core data structure and immutable instance creation (settings only)
 * - CoreMethods - Basic operations (update, utility methods)
 * - LanguageMethods - Language configuration operations
 * - PresentationMethods - Presentation settings operations
 * - StatsMethods - Stats chart preferences operations
 * - ParticipantMethods - Participant settings operations
 * - DataMethods - Data tracking settings operations
 * - AccessMethods - Access control settings operations
 * - DataPolicyMethods - Data policy settings operations
 * - LegalNoticeMethods - Legal notice settings operations
 * - ScheduleMethods - Publish schedule settings operations
 * - NotifyMethods - Notification settings operations
 * - ContentFormatMethods - Content format/sanitization settings operations
 *
 * IMMUTABILITY PATTERN:
 *
 * All operations that modify survey setting state return new instances rather than
 * mutating existing ones. This is achieved through:
 *
 * - newInstance() method in Base that creates new instances with changes
 * - Smart object reuse - unchanged objects are reused between instances
 * - Conditional instance creation - if no changes occur, the same instance is returned
 *
 * Example immutability flow:
 * SettingSurvey.updatePresentation({ format: 'question' })
 * → creates new presentation object with updated format
 * → calls newInstance() with { presentation: newPresentation }
 * → returns new SettingSurvey instance with updated presentation, reusing all other objects
 */
const SettingSurveyImpl = ContentFormatMethods(
  NotifyMethods(
    ScheduleMethods(
      LegalNoticeMethods(
        DataPolicyMethods(
          AccessMethods(
            DataMethods(
              ParticipantMethods(
                StatsMethods(
                  PresentationMethods(
                    LanguageMethods(
                      SettingSurveyCoreMethods(SettingSurveyBase),
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
 * SettingSurvey class - Immutable survey settings data structure with composed functionality
 *
 * This class combines data structure (Base) with behavioral mixins to create
 * a settings-focused model that maintains immutability across all operations.
 * All methods that modify state return new SettingSurvey instances.
 *
 * SettingSurvey contains only configuration and settings properties, excluding
 * survey content like groups, questions, titles, and welcome/thank you messages.
 */
export class SettingSurvey
  extends SettingSurveyImpl
  implements SettingSurveyInterface {}
