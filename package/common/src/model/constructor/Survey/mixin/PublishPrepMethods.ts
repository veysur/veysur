import { SettingSurvey } from '../../SettingSurvey'
import { SettingSurveyMethods } from '../../SettingSurvey/SettingSurveyInterface'
import { SurveyBase } from '../SurveyBase'
import { SurveyInterface } from '../SurveyInterface'
import { Constructor } from '../../../type'

/**
 * Base requirement for PublishPrepMethods: SurveyBase's own properties plus
 * the getter methods added by GetterMethods, which is always composed
 * before (inner to) PublishPrepMethods in both Survey.ts's mixin chain.
 */
type PublishPrepBase = SurveyBase &
  Pick<
    SurveyInterface,
    | 'getLanguage'
    | 'getPresentation'
    | 'getParticipant'
    | 'getData'
    | 'getAccess'
    | 'getNotify'
    | 'getDataPolicy'
    | 'getLegalNotice'
    | 'getSchedule'
  >

/**
 * PublishPrepMethods
 *
 * Some survey settings may fall back to project wide defaults by setting them to null.
 * A published survey must have fixed values for some of these settings such as
 * language and access settings. These values should not change while the survey
 * is active.
 */
export function PublishPrepMethods<T extends Constructor<PublishPrepBase>>(
  Base: T,
) {
  return class extends Base {
    /**
     * Prepare survey data for publish
     *
     * Resolve survey settings with defaults from setting survey.
     *
     * @param defaults
     * @returns
     */
    publishPrep(defaults: SettingSurvey): this {
      // The setLanguageProperty/update* methods are added by sibling mixins
      // (Language/Presentation/Participant/Data/Access/Notify/DataPolicy/
      // LegalNotice/Schedule Methods) composed around this one in Survey.ts -
      // not visible to this mixin's own Base type, but always present on the
      // real, fully-composed instance this method actually runs on.
      let survey = this as this & SettingSurveyMethods

      const language = this.getLanguage(defaults)

      // Apply all settings with defaults resolved
      // This is idempotent - safe to call multiple times
      survey = survey.setLanguageProperty('default', language.default)
      survey = survey.setLanguageProperty('options', language.options)
      survey = survey.updatePresentation(this.getPresentation(defaults))
      survey = survey.updateParticipant(this.getParticipant(defaults))
      survey = survey.updateData(this.getData(defaults))
      survey = survey.updateAccess(this.getAccess(defaults))
      survey = survey.updateNotify(this.getNotify(defaults))
      survey = survey.updateDataPolicy(this.getDataPolicy(defaults))
      survey = survey.updateLegalNotice(this.getLegalNotice(defaults))
      survey = survey.updateSchedule(this.getSchedule(defaults))

      return survey
    }

    /**
     * Get partial survey
     *
     * Resolve survey settings with defaults from setting survey.
     *
     * The partial is kept to minimum size by emptying groups and questions.
     *
     * @param defaults
     * @returns Survey
     */
    getPublishPartial(defaults: SettingSurvey): this {
      const survey = this.publishPrep(defaults)

      return this.newInstance({
        ...survey,
        elements: [],
        sections: [],
        elementIds: [],
        sectionIds: [],
      })
    }
  }
}
