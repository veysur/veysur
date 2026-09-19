import { L10n } from '../model/constructor/L10n'
import { Survey } from '../model/constructor/Survey'
import { SurveyLanguageData } from '../model/constructor/SurveyLanguage'
import { SurveyAnswerOptionImageValue } from '../model/constructor/Survey/SurveyAnswerOption'
import {
  SurveyQuestion,
  isSurveyQuestion,
} from '../model/constructor/Survey/SurveyQuestion'
import { SurveySection } from '../model/constructor/Survey/SurveySection'
import { SurveySubquestion } from '../model/constructor/Survey/SurveySubquestion'
import {
  SurveyContent,
  isSurveyContent,
} from '../model/constructor/Survey/SurveyContent'

interface LanguageLike {
  languageCode: string
  data: SurveyLanguageData
}

/**
 * Merge one or more SurveyLanguage (or SurveyLanguageSnapshot) records into a
 * Survey's sparse L10n fields.
 *
 * Pre-condition: both the survey and the language records are already loaded.
 * The caller is responsible for loading exactly the language codes needed.
 */
export function mergeSurveyLanguageIntoSurvey(
  survey: Survey,
  languages: LanguageLike[],
): Survey {
  if (!languages.length) return survey

  // --- Survey-level L10n accumulators ---
  let title = survey.title
  let dataPolicyText = survey.dataPolicy?.text ?? null
  let legalNoticeText = survey.legalNotice?.text ?? null

  // --- Welcome / thank-you singleton section accumulators (phase 1c) ---
  let welcomeSectionDesc = survey.welcomeSection?.desc ?? new L10n()
  let thankYouSectionDesc = survey.thankYouSection?.desc ?? new L10n()
  let thankYouSectionLinkUrl = new L10n(
    survey.thankYouSection?.config?.link?.url,
  )
  let thankYouSectionLinkText = new L10n(
    survey.thankYouSection?.config?.link?.text,
  )
  let welcomeSectionTouched = false
  let thankYouSectionTouched = false

  // --- Per-entity L10n update maps (accumulated across all languages) ---
  // sectionId → { name: L10n, desc: L10n | null }
  const sectionUpdates = new Map<string, { name: L10n; desc: L10n | null }>()
  // questionId → { text: L10n, detail: L10n | null }
  const questionUpdates = new Map<string, { text: L10n; detail: L10n | null }>()
  // subquestionId → { text: L10n, detail: L10n | null }
  const subquestionUpdates = new Map<
    string,
    { text: L10n; detail: L10n | null }
  >()
  // answerId → { label: L10n, image: Record<string, SurveyAnswerOptionImageValue | null> }
  const answerOptionUpdates = new Map<
    string,
    { label: L10n; image: Record<string, SurveyAnswerOptionImageValue | null> }
  >()
  // contentId → { text: L10n }
  const contentUpdates = new Map<string, { text: L10n }>()

  for (const lang of languages) {
    const code = lang.languageCode
    const data = lang.data

    if (data.title !== undefined) title = title.setLang(data.title, code)
    if (data.dataPolicyText !== undefined)
      dataPolicyText = (dataPolicyText ?? new L10n()).setLang(
        data.dataPolicyText,
        code,
      )
    if (data.legalNoticeText !== undefined)
      legalNoticeText = (legalNoticeText ?? new L10n()).setLang(
        data.legalNoticeText,
        code,
      )

    for (const [sectionId, sectionText] of Object.entries(
      data.sections ?? {},
    )) {
      const existing = sectionUpdates.get(sectionId) ?? {
        name: survey.sections.groups().getById(sectionId)?.name ?? new L10n(),
        desc: survey.sections.groups().getById(sectionId)?.desc ?? null,
      }
      if (sectionText.name !== undefined)
        existing.name = existing.name.setLang(sectionText.name, code)
      if (sectionText.desc !== undefined)
        existing.desc = (existing.desc ?? new L10n()).setLang(
          sectionText.desc,
          code,
        )
      sectionUpdates.set(sectionId, existing)
    }

    // `data.elements` carries every element keyed by `_id`. Route content
    // elements to their own update map (no `detail` / nested entities);
    // everything else is a question.
    for (const [elementId, elementText] of Object.entries(
      data.elements ?? {},
    )) {
      const element = survey.elements.getById(elementId)
      if (isSurveyContent(element)) {
        const existing = contentUpdates.get(elementId) ?? {
          text: element.text ?? new L10n(),
        }
        if (elementText.text !== undefined)
          existing.text = existing.text.setLang(elementText.text, code)
        contentUpdates.set(elementId, existing)
        continue
      }
      const existing = questionUpdates.get(elementId) ?? {
        text: element?.text ?? new L10n(),
        detail: (isSurveyQuestion(element) ? element.detail : null) ?? null,
      }
      if (elementText.text !== undefined)
        existing.text = existing.text.setLang(elementText.text, code)
      if (elementText.detail !== undefined)
        existing.detail = (existing.detail ?? new L10n()).setLang(
          elementText.detail,
          code,
        )
      questionUpdates.set(elementId, existing)
    }

    for (const [subquestionId, subquestionText] of Object.entries(
      data.subquestions ?? {},
    )) {
      // Subquestions are nested inside questions — look them up by iterating questions
      const currentQuestion = survey.elements
        .questionList()
        .find((q) => q.subquestions?.getById(subquestionId) !== undefined)
      const existing = subquestionUpdates.get(subquestionId) ?? {
        text:
          currentQuestion?.subquestions?.getById(subquestionId)?.text ??
          new L10n(),
        detail:
          currentQuestion?.subquestions?.getById(subquestionId)?.detail ?? null,
      }
      if (subquestionText.text !== undefined)
        existing.text = existing.text.setLang(subquestionText.text, code)
      if (subquestionText.detail !== undefined)
        existing.detail = (existing.detail ?? new L10n()).setLang(
          subquestionText.detail,
          code,
        )
      subquestionUpdates.set(subquestionId, existing)
    }

    for (const [answerId, answerText] of Object.entries(
      data.answerOptions ?? {},
    )) {
      const currentQuestion = survey.elements
        .questionList()
        .find((q) => q.answerOptions?.getById(answerId) !== undefined)
      const existing = answerOptionUpdates.get(answerId) ?? {
        label:
          currentQuestion?.answerOptions?.getById(answerId)?.label ??
          new L10n(),
        image: {} as Record<string, SurveyAnswerOptionImageValue | null>,
      }
      if (answerText.label !== undefined)
        existing.label = existing.label.setLang(answerText.label, code)
      if (answerText.image !== undefined)
        // Include null values — null means explicitly cleared for this language.
        existing.image = { ...existing.image, [code]: answerText.image }
      answerOptionUpdates.set(answerId, existing)
    }

    if (data.welcomeSectionDesc !== undefined) {
      welcomeSectionTouched = true
      welcomeSectionDesc = welcomeSectionDesc.setLang(
        data.welcomeSectionDesc,
        code,
      )
    }
    if (data.thankYouSectionDesc !== undefined) {
      thankYouSectionTouched = true
      thankYouSectionDesc = thankYouSectionDesc.setLang(
        data.thankYouSectionDesc,
        code,
      )
    }
    if (data.thankYouSectionLinkUrl !== undefined) {
      thankYouSectionTouched = true
      thankYouSectionLinkUrl = thankYouSectionLinkUrl.setLang(
        data.thankYouSectionLinkUrl,
        code,
      )
    }
    if (data.thankYouSectionLinkText !== undefined) {
      thankYouSectionTouched = true
      thankYouSectionLinkText = thankYouSectionLinkText.setLang(
        data.thankYouSectionLinkText,
        code,
      )
    }
  }

  // --- Apply group + welcome/thank-you-section updates onto the mixed sections
  // collection (never the groups-only view, or welcome/thank-you sections are
  // dropped on rebuild). ---
  let updatedSections = survey.sections
  for (const [sectionId, updates] of sectionUpdates) {
    updatedSections = updatedSections.mutateById(
      sectionId,
      (section) => new SurveySection({ ...section, ...updates }),
    )
  }

  const welcomeSection = survey.welcomeSection
  if (welcomeSection && welcomeSectionTouched) {
    updatedSections = updatedSections.mutateById(
      welcomeSection._id,
      (s) => new SurveySection({ ...s, desc: welcomeSectionDesc }),
    )
  }

  const thankYouSection = survey.thankYouSection
  if (thankYouSection && thankYouSectionTouched) {
    updatedSections = updatedSections.mutateById(
      thankYouSection._id,
      (s) =>
        new SurveySection({
          ...s,
          desc: thankYouSectionDesc,
          config: {
            ...s.config,
            link: {
              url: thankYouSectionLinkUrl,
              text: thankYouSectionLinkText,
            },
          },
        }),
    )
  }

  // --- Apply question + nested subquestion/answerOption + content-element
  // updates onto the mixed element collection (never the questions-only view,
  // or content elements are dropped on rebuild). ---
  let updatedElements = survey.elements
  for (const question of survey.elements.questionList()) {
    const qUpdate = questionUpdates.get(question._id)

    // Collect subquestion updates for this question
    let updatedSubquestions = question.subquestions
    if (updatedSubquestions) {
      for (const subquestion of updatedSubquestions) {
        const sqUpdate = subquestionUpdates.get(subquestion._id)
        if (sqUpdate) {
          updatedSubquestions = updatedSubquestions.mutateById(
            subquestion._id,
            (sq) => new SurveySubquestion({ ...sq, ...sqUpdate }),
          )
        }
      }
    }

    // Collect answerOption updates for this question
    let updatedAnswerOptions = question.answerOptions
    if (updatedAnswerOptions) {
      for (const answerOption of updatedAnswerOptions) {
        const aoUpdate = answerOptionUpdates.get(answerOption._id)
        if (aoUpdate) {
          updatedAnswerOptions = updatedAnswerOptions.mutateById(
            answerOption._id,
            (ao) =>
              ao.update({
                label: aoUpdate.label,
                image: Object.keys(aoUpdate.image).length
                  ? aoUpdate.image
                  : (ao.image ?? null),
              }),
          )
        }
      }
    }

    const hasQuestionChange =
      qUpdate ||
      updatedSubquestions !== question.subquestions ||
      updatedAnswerOptions !== question.answerOptions

    if (hasQuestionChange) {
      updatedElements = updatedElements.mutateQuestionById(
        question._id,
        (q) =>
          new SurveyQuestion({
            ...q,
            ...(qUpdate ?? {}),
            ...(updatedSubquestions !== question.subquestions
              ? { subquestions: updatedSubquestions }
              : {}),
            ...(updatedAnswerOptions !== question.answerOptions
              ? { answerOptions: updatedAnswerOptions }
              : {}),
          }),
      )
    }
  }

  for (const [elementId, update] of contentUpdates) {
    updatedElements = updatedElements.mutateById(
      elementId,
      (el) =>
        new SurveyContent({
          ...(el as unknown as SurveyContent),
          text: update.text,
        }) as unknown as typeof el,
    )
  }

  // --- Build the survey update payload ---
  const surveyUpdate: Record<string, unknown> = { title }

  if (
    dataPolicyText !== (survey.dataPolicy?.text ?? null) &&
    survey.dataPolicy
  ) {
    surveyUpdate.dataPolicy = { ...survey.dataPolicy, text: dataPolicyText }
  }

  if (
    legalNoticeText !== (survey.legalNotice?.text ?? null) &&
    survey.legalNotice
  ) {
    surveyUpdate.legalNotice = { ...survey.legalNotice, text: legalNoticeText }
  }

  if (updatedSections !== survey.sections)
    surveyUpdate.sections = updatedSections
  if (updatedElements !== survey.elements)
    surveyUpdate.elements = updatedElements

  return survey.update(surveyUpdate)
}
