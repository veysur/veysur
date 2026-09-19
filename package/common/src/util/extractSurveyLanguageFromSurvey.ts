import { L10n } from '../model/constructor/L10n'
import { Survey } from '../model/constructor/Survey'
import { isSurveyQuestion } from '../model/constructor/Survey/SurveyQuestion'
import {
  SurveyLanguage,
  SurveyLanguageData,
} from '../model/constructor/SurveyLanguage'

/**
 * Extract one language's text from a fully-populated Survey into a SurveyLanguage record.
 *
 * Only the exact language code's value is extracted — no cross-language fallback.
 */
export function extractSurveyLanguageFromSurvey(
  survey: Survey,
  surveyId: string,
  languageCode: string,
): SurveyLanguage {
  const data: SurveyLanguageData = {}

  const title = getLangValue(survey.title, languageCode)
  if (title !== null) data.title = title

  const welcomeSectionDesc = getLangValue(
    survey.welcomeSection?.desc,
    languageCode,
  )
  if (welcomeSectionDesc !== null) data.welcomeSectionDesc = welcomeSectionDesc

  const thankYouSection = survey.thankYouSection
  if (thankYouSection) {
    const desc = getLangValue(thankYouSection.desc, languageCode)
    if (desc !== null) data.thankYouSectionDesc = desc
    const linkUrl = getLangValue(
      thankYouSection.config?.link?.url,
      languageCode,
    )
    if (linkUrl !== null) data.thankYouSectionLinkUrl = linkUrl
    const linkText = getLangValue(
      thankYouSection.config?.link?.text,
      languageCode,
    )
    if (linkText !== null) data.thankYouSectionLinkText = linkText
  }

  const dataPolicyText = getLangValue(survey.dataPolicy?.text, languageCode)
  if (dataPolicyText !== null) data.dataPolicyText = dataPolicyText

  const legalNoticeText = getLangValue(survey.legalNotice?.text, languageCode)
  if (legalNoticeText !== null) data.legalNoticeText = legalNoticeText

  for (const section of survey.sections.groups() ?? []) {
    const name = getLangValue(section.name, languageCode)
    const desc = getLangValue(section.desc, languageCode)
    if (name !== null || desc !== null) {
      if (!data.sections) data.sections = {}
      data.sections[section._id] = {}
      if (name !== null) data.sections[section._id].name = name
      if (desc !== null) data.sections[section._id].desc = desc
    }
  }

  for (const element of survey.elements ?? []) {
    const qText = getLangValue(element.text, languageCode)
    const qDetail = isSurveyQuestion(element)
      ? getLangValue(element.detail, languageCode)
      : null
    if (qText !== null || qDetail !== null) {
      if (!data.elements) data.elements = {}
      data.elements[element._id] = {}
      if (qText !== null) data.elements[element._id].text = qText
      if (qDetail !== null) data.elements[element._id].detail = qDetail
    }

    if (!isSurveyQuestion(element)) continue

    for (const subquestion of element.subquestions ?? []) {
      const sqText = getLangValue(subquestion.text, languageCode)
      const sqDetail = getLangValue(subquestion.detail, languageCode)
      if (sqText !== null || sqDetail !== null) {
        if (!data.subquestions) data.subquestions = {}
        data.subquestions[subquestion._id] = {}
        if (sqText !== null) data.subquestions[subquestion._id].text = sqText
        if (sqDetail !== null)
          data.subquestions[subquestion._id].detail = sqDetail
      }
    }

    for (const answerOption of element.answerOptions ?? []) {
      const label = getLangValue(answerOption.label, languageCode)
      const image = answerOption.image?.[languageCode] ?? null
      if (label !== null || image !== null) {
        if (!data.answerOptions) data.answerOptions = {}
        if (!data.answerOptions[answerOption._id])
          data.answerOptions[answerOption._id] = {}
        if (label !== null) data.answerOptions[answerOption._id].label = label
        if (image !== null) data.answerOptions[answerOption._id].image = image
      }
    }
  }

  return new SurveyLanguage({ surveyId, languageCode, data })
}

function getLangValue(
  l10n: L10n | Record<string, unknown> | null | undefined,
  code: string,
): string | null {
  if (!l10n) return null
  const val = (l10n as Record<string, unknown>)[code]
  return typeof val === 'string' ? val : null
}
