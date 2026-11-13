import { Constructor } from '../type'
import { mix } from './mix'
import { SettingSurveyMixinBase } from './SettingSurvey/mixin/SettingSurveyMixinBase'
import { LanguageMethods } from './SettingSurvey/mixin/LanguageMethods'
import { PresentationMethods } from './SettingSurvey/mixin/PresentationMethods'
import { StatsMethods } from './SettingSurvey/mixin/StatsMethods'
import { ParticipantMethods } from './SettingSurvey/mixin/ParticipantMethods'
import { DataMethods } from './SettingSurvey/mixin/DataMethods'
import { DataPolicyMethods } from './SettingSurvey/mixin/DataPolicyMethods'
import { LegalNoticeMethods } from './SettingSurvey/mixin/LegalNoticeMethods'
import { ScheduleMethods } from './SettingSurvey/mixin/ScheduleMethods'
import { NotifyMethods } from './SettingSurvey/mixin/NotifyMethods'
import { AccessMethods } from './SettingSurvey/mixin/AccessMethods'
import { ContentFormatMethods } from './SettingSurvey/mixin/ContentFormatMethods'

/** Every survey-settings mixin, shared by `Survey` and `SettingSurvey`. */
export function SurveySettingsBundle<
  T extends Constructor<SettingSurveyMixinBase>,
>(Base: T) {
  return mix(Base)
    .with(LanguageMethods)
    .with(PresentationMethods)
    .with(StatsMethods)
    .with(ParticipantMethods)
    .with(DataMethods)
    .with(DataPolicyMethods)
    .with(LegalNoticeMethods)
    .with(ScheduleMethods)
    .with(NotifyMethods)
    .with(AccessMethods)
    .with(ContentFormatMethods).base
}
