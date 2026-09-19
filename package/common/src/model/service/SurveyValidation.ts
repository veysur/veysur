import { Survey } from '../constructor/Survey'
import {
  SECTION_KIND_WELCOME,
  SECTION_KIND_THANK_YOU,
} from '../constructor/Survey/SurveySection'
import { SettingSurvey } from '../constructor/SettingSurvey'
import { L10n } from '../constructor/L10n'
import { schemaManager } from '../schema-manager'
import { isMatrixQuestionType } from '../constructor/Survey/Matrix'
import { isMultiPartQuestionType } from '../constructor/Survey/MultiPart'
import { resolveContentFormat } from '../content/resolveContentFormat'
import { sanitizeContent } from '../content/sanitizeContent'
import { renderMarkdownToHtml } from '../content/renderMarkdown'
import {
  ConditionValidator,
  GroupInfo,
  QuestionInfo,
  buildSurveyStructureInfo,
  questionTypeHasStoredAnswerOptions,
} from './SurveyCondition'
import { validateTextExpressions } from './SurveyExpression'

// Any HTML-tag-shaped substring - used to hard-reject markup in 'plain' format,
// where no HTML/markdown interpretation is permitted at all.
const HTML_TAG_PATTERN = /<[a-z][\s\S]*>/i

export interface SurveyValidationResult {
  isValid: boolean
  errors: { [path: string]: string[] }
}

type ErrorMap = { [path: string]: string[] }

/**
 * Merges `source` error messages into `target` in place, concatenating the
 * message arrays when both maps carry the same path.
 */
function mergeErrors(target: ErrorMap, source: ErrorMap): void {
  for (const path in source) {
    target[path] = target[path]
      ? [...target[path], ...source[path]]
      : source[path]
  }
}

function validationResult(errors: ErrorMap): SurveyValidationResult {
  return { isValid: Object.keys(errors).length === 0, errors }
}

export class SurveyValidation {
  /**
   * Validates a survey for publishing
   *
   * @param survey - The survey to validate
   * @param settingSurvey - Optional project-level default settings
   * @param participantVariableNames - Optional set of known participant variable names
   *                                   (system + custom attributes) for this survey; defaults
   *                                   to the system attribute names only when omitted
   * @returns Validation result with isValid flag and errors object
   */
  async validate(
    survey: Survey,
    settingSurvey?: SettingSurvey,
    participantVariableNames?: Set<string>,
  ): Promise<SurveyValidationResult> {
    const errors: { [path: string]: string[] } = {}

    // Perform schema validation
    const schemaResult = await this.validateSchemas(survey)
    Object.assign(errors, schemaResult.errors)

    // Perform business rule validation
    const businessResult = this.validateBusinessRules(
      survey,
      settingSurvey,
      participantVariableNames,
    )
    mergeErrors(errors, businessResult.errors)

    return validationResult(errors)
  }

  /**
   * Validates survey, question groups, and questions against their schemas
   */
  private async validateSchemas(
    survey: Survey,
  ): Promise<SurveyValidationResult> {
    const errors: { [path: string]: string[] } = {}

    // Validate survey schema
    const surveySchema = schemaManager.getSchema('survey')
    if (surveySchema) {
      const surveyResult = await surveySchema.validate(survey)
      if (!surveyResult.isValid && surveyResult.errors) {
        Object.assign(errors, surveyResult.errors)
      }
    }

    // Validate each question group
    const groupSchema = schemaManager.getSchema('surveySection')
    if (groupSchema) {
      for (const group of survey.sections.groups()) {
        const groupResult = await groupSchema.validate(group)
        if (!groupResult.isValid && groupResult.errors) {
          for (const path in groupResult.errors) {
            const pathErrors = groupResult.errors[path]
            if (Array.isArray(pathErrors)) {
              const groupPath = `groups.${group._id}.${path}`
              errors[groupPath] = pathErrors
            }
          }
        }
      }
    }

    // Validate each question
    const questionSchema = schemaManager.getSchema('surveyElement')
    if (questionSchema) {
      for (const question of survey.elements.questionList()) {
        const questionResult = await questionSchema.validate(question)
        if (!questionResult.isValid && questionResult.errors) {
          for (const path in questionResult.errors) {
            const pathErrors = questionResult.errors[path]
            if (Array.isArray(pathErrors)) {
              const questionPath = `questions.${question._id}.${path}`
              errors[questionPath] = pathErrors
            }
          }
        }
      }
    }

    return validationResult(errors)
  }

  /**
   * Validates business rules that cannot be expressed in schema validation
   */
  private validateBusinessRules(
    survey: Survey,
    settingSurvey?: SettingSurvey,
    participantVariableNames?: Set<string>,
  ): SurveyValidationResult {
    const errors: { [path: string]: string[] } = {}

    // Determine default language
    let defaultLang = 'en'
    if (survey.language?.default) {
      defaultLang = survey.language.default
    } else if (settingSurvey?.language?.default) {
      defaultLang = settingSurvey.language.default
    }

    // Check title requirement if presentation.title is enabled
    if (survey.presentation?.title === true) {
      const titleValue = survey.title?.[defaultLang]
      if (
        !titleValue ||
        (typeof titleValue === 'string' && titleValue.trim() === '')
      ) {
        const path = `title.${defaultLang}`
        errors[path] = ['Title is required when title display is enabled']
      }
    }

    // Check for at least one question group
    if (!survey.sections.groups() || survey.sections.groups().length === 0) {
      errors['groups'] = ['Survey must contain at least one question group']
    }

    // Check for at least one question
    if (
      !survey.elements.questionList() ||
      survey.elements.questionList().length === 0
    ) {
      errors['questions'] = ['Survey must contain at least one question']
    }

    // At most one welcome section and one thank-you section (phase 1c)
    const welcomeSectionCount = survey.sections.filter(
      (s) => s.kind === SECTION_KIND_WELCOME,
    ).length
    if (welcomeSectionCount > 1) {
      errors['sections.welcome'] = [
        'Survey must not contain more than one welcome section',
      ]
    }
    const thankYouSectionCount = survey.sections.filter(
      (s) => s.kind === SECTION_KIND_THANK_YOU,
    ).length
    if (thankYouSectionCount > 1) {
      errors['sections.thankYou'] = [
        'Survey must not contain more than one thank-you section',
      ]
    }

    // Survey structure shared by condition + text-expression validation
    // (`includeEmptyGroups` so a `labels.<group>` reference to an as-yet
    // empty group still resolves).
    const { questionsInfo, groupsInfo, groupPositionById } =
      buildSurveyStructureInfo(survey, { includeEmptyGroups: true })

    // Validate conditions
    const conditionResult = this.validateConditions(
      survey,
      questionsInfo,
      groupPositionById,
      participantVariableNames,
    )
    mergeErrors(errors, conditionResult.errors)

    // Validate L10n content
    const l10nResult = this.validateL10nContent(survey, defaultLang)
    mergeErrors(errors, l10nResult.errors)

    // Validate code uniqueness
    const uniqueCodesResult = this.validateUniqueCodes(survey)
    mergeErrors(errors, uniqueCodesResult.errors)

    // Validate content format/sanitization (the real server-side security
    // boundary for question/group/welcome/thank-you/legal-notice/data-policy
    // text - see docs/plan/considering/content-markdown.md)
    const contentFormatResult = this.validateContentFormat(
      survey,
      settingSurvey,
    )
    mergeErrors(errors, contentFormatResult.errors)

    // Validate embedded {{expression}} tokens in survey text against the
    // survey structure (unknown/misused variable paths, forward references).
    const textExpressionResult = this.validateTextExpressionFields(
      survey,
      questionsInfo,
      groupsInfo,
      groupPositionById,
      participantVariableNames,
    )
    mergeErrors(errors, textExpressionResult.errors)

    return validationResult(errors)
  }

  /**
   * Validates every `{{expression}}` token embedded in survey text (title,
   * welcome/thank-you messages, group name/description, question text/detail,
   * subquestion text, answer-option labels, legal-notice and data-policy
   * text) against the survey structure. A text expression is held to the same
   * variable-addressing rules as a condition: it can only name a question or
   * group that exists, cannot forward-reference (`answers.*` / `answerLabels.*`
   * only), and must address a matrix cell as
   * `<Q>.<subQuestion>.<answerOption>`.
   */
  private validateTextExpressionFields(
    survey: Survey,
    questionsInfo: QuestionInfo[],
    groupsInfo: GroupInfo[],
    groupPositionById: Map<string, number>,
    participantVariableNames?: Set<string>,
  ): SurveyValidationResult {
    const lastPosition = survey.elements.questionList().length

    const messagesByPath = new Map<string, Set<string>>()

    const checkField = (
      path: string,
      l10n: L10n | null | undefined,
      position: number,
    ) => {
      if (!l10n) return
      for (const lang of Object.keys(l10n)) {
        const raw = l10n[lang]
        if (typeof raw !== 'string' || raw.trim() === '') continue
        const fieldErrors = validateTextExpressions(raw, {
          availableQuestions: questionsInfo.filter(
            (question) => question.position < position,
          ),
          position,
          participantVariableNames,
          availableGroups: groupsInfo.filter(
            (group) => group.position < position,
          ),
          allQuestions: questionsInfo,
          allGroups: groupsInfo,
        })
        for (const fieldError of fieldErrors) {
          const bucket = messagesByPath.get(path) ?? new Set<string>()
          bucket.add(
            `{{${fieldError.expression.trim()}}}: ${fieldError.message}`,
          )
          messagesByPath.set(path, bucket)
        }
      }
    }

    checkField('title', survey.title, 0)
    checkField('welcome.message', survey.welcomeSection?.desc, 0)
    checkField('thankYou.message', survey.thankYouSection?.desc, lastPosition)
    checkField(
      'thankYou.link.text',
      survey.thankYouSection?.config?.link?.text
        ? new L10n(survey.thankYouSection.config.link.text)
        : undefined,
      lastPosition,
    )
    checkField('legalNotice.text', survey.legalNotice?.text, 0)
    checkField('dataPolicy.text', survey.dataPolicy?.text, 0)

    for (const group of survey.sections.groups()) {
      const position = groupPositionById.get(group._id) ?? 0
      checkField(`groups.${group._id}.name`, group.name, position)
      checkField(`groups.${group._id}.desc`, group.desc, position)
    }

    survey.elements.questionList().forEach((question, index) => {
      checkField(`questions.${question._id}.text`, question.text, index)
      checkField(`questions.${question._id}.detail`, question.detail, index)
      for (const subquestion of question.subquestions ?? []) {
        checkField(
          `questions.${question._id}.subquestions.${subquestion._id}.text`,
          subquestion.text,
          index,
        )
      }
      for (const option of question.answerOptions ?? []) {
        checkField(
          `questions.${question._id}.answerOptions.${option._id}.label`,
          option.label,
          index,
        )
      }
    })

    const errors: { [path: string]: string[] } = {}
    for (const [path, messages] of messagesByPath) {
      errors[path] = [...messages]
    }
    return validationResult(errors)
  }

  /**
   * Validates that stored content (question text/detail, group description,
   * welcome/thank-you messages, legal notice and data policy text) matches
   * the survey's effective content format (`plain`/`html`/`markdown`) and
   * contains no markup the sanitizer would strip. This is the actual
   * server-side security boundary against stored XSS - see
   * docs/plan/considering/content-markdown.md.
   *
   * No silent auto-stripping: any mismatch hard-blocks publish rather than
   * mutating content the admin believes is stored verbatim.
   */
  private validateContentFormat(
    survey: Survey,
    settingSurvey?: SettingSurvey,
  ): SurveyValidationResult {
    const errors: { [path: string]: string[] } = {}

    const defaults = settingSurvey ?? new SettingSurvey()
    const content = survey.getContentFormat(defaults)
    const format = resolveContentFormat(content)
    const scriptTagsAllowed = content.scriptTagsAllowed

    const checkField = (path: string, l10n: L10n | null | undefined) => {
      if (!l10n) {
        return
      }
      for (const lang of Object.keys(l10n)) {
        const raw = l10n[lang]
        if (typeof raw !== 'string' || raw.trim() === '') {
          continue
        }

        let isValid: boolean
        if (format === 'plain') {
          isValid = !HTML_TAG_PATTERN.test(raw)
        } else if (format === 'html') {
          isValid = sanitizeContent(raw, { scriptTagsAllowed }) === raw
        } else {
          const rendered = renderMarkdownToHtml(raw)
          isValid =
            sanitizeContent(rendered, { scriptTagsAllowed }) === rendered
        }

        if (!isValid) {
          errors[`${path}.${lang}`] = [
            format === 'plain'
              ? 'Content must not contain HTML markup when the content format is plain text'
              : 'Content contains markup that is not permitted by this survey’s content settings',
          ]
        }
      }
    }

    for (const question of survey.elements.questionList()) {
      checkField(`questions.${question._id}.text`, question.text)
      checkField(`questions.${question._id}.detail`, question.detail)
    }

    for (const group of survey.sections.groups()) {
      checkField(`groups.${group._id}.desc`, group.desc)
    }

    checkField('welcome.message', survey.welcomeSection?.desc)
    checkField('thankYou.message', survey.thankYouSection?.desc)

    const legalNotice = survey.getLegalNotice(defaults)
    checkField('legalNotice.text', legalNotice.text)

    const dataPolicy = survey.getDataPolicy(defaults)
    checkField('dataPolicy.text', dataPolicy.text)

    return validationResult(errors)
  }

  /**
   * Validates code uniqueness: question codes and group codes must be
   * unique across the whole survey; subquestion codes and answer-option
   * codes only need to be unique among their own siblings within the
   * owning question.
   */
  private validateUniqueCodes(survey: Survey): SurveyValidationResult {
    const errors: { [path: string]: string[] } = {}

    const findDuplicates = (codes: string[]): Set<string> => {
      const seen = new Set<string>()
      const duplicates = new Set<string>()
      for (const code of codes) {
        if (seen.has(code)) {
          duplicates.add(code)
        }
        seen.add(code)
      }
      return duplicates
    }

    const duplicateQuestionCodes = findDuplicates(
      survey.elements.questionList().map((question) => question.code),
    )
    for (const question of survey.elements.questionList()) {
      if (duplicateQuestionCodes.has(question.code)) {
        errors[`questions.${question._id}.code`] = [
          `Duplicate code "${question.code}"`,
        ]
      }
    }

    const duplicateGroupCodes = findDuplicates(
      survey.sections.groups().map((group) => group.code),
    )
    for (const group of survey.sections.groups()) {
      if (duplicateGroupCodes.has(group.code)) {
        errors[`groups.${group._id}.code`] = [`Duplicate code "${group.code}"`]
      }
    }

    for (const question of survey.elements.questionList()) {
      if (question.subquestions) {
        const duplicateSubquestionCodes = findDuplicates(
          question.subquestions.map((subquestion) => subquestion.code),
        )
        for (const subquestion of question.subquestions) {
          if (duplicateSubquestionCodes.has(subquestion.code)) {
            errors[
              `questions.${question._id}.subquestions.${subquestion._id}.code`
            ] = [`Duplicate code "${subquestion.code}"`]
          }
        }
      }

      if (question.answerOptions) {
        const duplicateAnswerOptionCodes = findDuplicates(
          question.answerOptions.map((option) => option.code),
        )
        for (const option of question.answerOptions) {
          if (duplicateAnswerOptionCodes.has(option.code)) {
            errors[
              `questions.${question._id}.answerOptions.${option._id}.code`
            ] = [`Duplicate code "${option.code}"`]
          }
        }
      }
    }

    return validationResult(errors)
  }

  private validateL10nContent(
    survey: Survey,
    defaultLang: string,
  ): SurveyValidationResult {
    const errors: { [path: string]: string[] } = {}

    for (const question of survey.elements.questionList()) {
      const questionText = question.text?.[defaultLang]
      if (
        !questionText ||
        (typeof questionText === 'string' && questionText.trim() === '')
      ) {
        errors[`questions.${question._id}.text`] = [
          `Question text is required in the default language (${defaultLang})`,
        ]
      }

      if (
        (isMatrixQuestionType(question.type) ||
          isMultiPartQuestionType(question.type)) &&
        question.subquestions
      ) {
        for (const subquestion of question.subquestions) {
          const subText = subquestion.text?.[defaultLang]
          if (
            !subText ||
            (typeof subText === 'string' && subText.trim() === '')
          ) {
            errors[
              `questions.${question._id}.subquestions.${subquestion._id}.text`
            ] = [
              `Subquestion text is required in the default language (${defaultLang})`,
            ]
          }
        }
      }

      if (
        questionTypeHasStoredAnswerOptions(question.type) &&
        question.answerOptions
      ) {
        for (const option of question.answerOptions) {
          const label = option.label?.[defaultLang]
          if (!label || (typeof label === 'string' && label.trim() === '')) {
            errors[
              `questions.${question._id}.answerOptions.${option._id}.label`
            ] = [
              `Answer option label is required in the default language (${defaultLang})`,
            ]
          }
        }
      }
    }

    return validationResult(errors)
  }

  /**
   * Validates all conditions in the survey
   */
  private validateConditions(
    survey: Survey,
    questionsInfo: QuestionInfo[],
    groupPositionById: Map<string, number>,
    participantVariableNames?: Set<string>,
  ): SurveyValidationResult {
    const errors: { [path: string]: string[] } = {}

    // Validate group conditions
    for (const group of survey.sections.groups()) {
      if (group.condition) {
        const groupPosition = groupPositionById.get(group._id) ?? 0
        const result = ConditionValidator.validate(
          group.condition,
          questionsInfo,
          groupPosition,
          participantVariableNames,
        )
        if (!result.isValid) {
          const path = `groups.${group._id}.condition`
          errors[path] = result.errors
        }
      }
    }

    // Validate question conditions
    for (let i = 0; i < survey.elements.questionList().length; i++) {
      const question = survey.elements.questionList()[i]
      if (question.condition) {
        const result = ConditionValidator.validate(
          question.condition,
          questionsInfo,
          i,
          participantVariableNames,
        )
        if (!result.isValid) {
          const path = `questions.${question._id}.condition`
          errors[path] = result.errors
        }
      }
    }

    return validationResult(errors)
  }
}

export default SurveyValidation
