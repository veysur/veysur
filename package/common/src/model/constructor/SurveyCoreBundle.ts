import { mix } from './mix'
import { SurveyBase } from './Survey/SurveyBase'
import { SettingSurveyCoreMethods } from './SettingSurvey/mixin/SettingSurveyCoreMethods'
import { GetterMethods } from './Survey/mixin/GetterMethods'
import { SurveyCoreMethods } from './Survey/mixin/SurveyCoreMethods'
import { PublishPrepMethods } from './Survey/mixin/PublishPrepMethods'

/** Core update/sort operations, runtime getters and publish preparation. */
export const SurveyCoreBundle = mix(SurveyBase)
  .with(SettingSurveyCoreMethods)
  .with(GetterMethods)
  .with(SurveyCoreMethods)
  .with(PublishPrepMethods).base
