import { mix } from './mix'
import { SectionMethods } from './Survey/mixin/SectionMethods'
import { QuestionMethods } from './Survey/mixin/QuestionMethods'
import { ContentMethods } from './Survey/mixin/ContentMethods'
import { SubquestionMethods } from './Survey/mixin/SubquestionMethods'
import { AnswerOptionMethods } from './Survey/mixin/AnswerOptionMethods'
import { WelcomeThankYouSectionMethods } from './Survey/mixin/WelcomeThankYouSectionMethods'
import { SurveyCoreBundle } from './SurveyCoreBundle'

/** Section, question, content, subquestion, answer option and welcome/thank-you operations. */
export const SurveyStructureBundle = mix(SurveyCoreBundle)
  .with(SectionMethods)
  .with(QuestionMethods)
  .with(ContentMethods)
  .with(SubquestionMethods)
  .with(AnswerOptionMethods)
  .with(WelcomeThankYouSectionMethods).base
