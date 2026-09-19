import { L10n } from '../L10n'
import { ChartType, ChartValueMode } from '../SettingSurvey/SettingSurveyBase'
import { SurveySectionCollection } from './SurveySectionCollection'
import { SurveyElementCollection } from './SurveyElementCollection'
import { SurveySection, SurveySectionData } from './SurveySection'
import { SurveyQuestion, SurveyQuestionData } from './SurveyQuestion'
import {
  SurveyAnswerOption,
  SurveyAnswerOptionData,
} from './SurveyAnswerOption'
import { SurveySubquestion, SurveySubquestionData } from './SurveySubquestion'
import { SurveyData } from './SurveyBase'
import {
  SettingSurveyProperties,
  SettingSurveyMethods,
} from '../SettingSurvey/SettingSurveyInterface'
import { SettingSurvey } from '../SettingSurvey'
import { AttributeValue, SurveyAttributes } from './attributeMeta'

export interface SurveyInterface
  extends
    Omit<
      SettingSurveyProperties,
      | 'language'
      | 'presentation'
      | 'participant'
      | 'data'
      | 'access'
      | 'dataPolicy'
      | 'legalNotice'
      | 'schedule'
      | 'notify'
      | 'stats'
      | 'contentFormat'
    >,
    SettingSurveyMethods {
  // Additional properties from Survey Base (extends SettingSurvey)
  createdById: string
  name: string
  title: L10n
  attributes: SurveyAttributes
  sections: SurveySectionCollection
  elements: SurveyElementCollection
  sectionIds: string[]
  elementIds: string[]

  // Survey-specific nullable properties for SettingSurvey-inherited properties
  language?: {
    default?: string | null
    options?: string[] | null
  }
  presentation?: {
    format?: 'group' | 'question' | 'all' | null
    noAnswer?: boolean | null
    title?: boolean | null
    welcomeMessage?: boolean | null
    progressBar?: boolean | null
    questionCount?: boolean | null
    groupName?: boolean | null
    groupDesc?: boolean | null
    questionNum?: boolean | null
    questionCode?: boolean | null
    questionIndex?: boolean | null
    backNav?: boolean | null
    redirectEnd?: boolean | null
    navDelay?: number | null
    print?: boolean | null
    stats?: boolean | null
    noBrand?: boolean | null
    thankYouLink?: boolean | null
  }
  participant?: {
    htmlEmail?: boolean | null
    thankYouEmail?: boolean | null
    tokenLength?: number | null
  }
  data?: {
    timestamp?: boolean | null
    ip?: boolean | null
    anonymiseIp?: boolean | null
    referrerUrl?: boolean | null
    timings?: boolean | null
    assessment?: boolean | null
  }
  access?: {
    anonymous?: boolean | null
    open?: boolean | null
    publicReg?: boolean | null
    index?: boolean | null
    tokenPersist?: boolean | null
    multiple?: boolean | null
    repeatCookie?: boolean | null
    resumeLink?: boolean | null
    captcha?: boolean | null
    captchaReg?: boolean | null
    captchaResume?: boolean | null
  }
  dataPolicy?: {
    show?: boolean | null
    link?: boolean | null
    text?: L10n | null
  }
  legalNotice?: {
    show?: boolean | null
    link?: boolean | null
    text?: L10n | null
  }
  schedule?: {
    start?: Date | null
    end?: Date | null
  }
  notify?: {
    basic?: string | null
    detailed?: string | null
  }
  stats?: {
    questions?: {
      [questionCode: string]: {
        chartType?: ChartType | null
        valueMode?: ChartValueMode | null
      }
    } | null
  }
  contentFormat?: {
    htmlAllowed?: boolean | null
    markdownAllowed?: boolean | null
    scriptTagsAllowed?: boolean | null
  }

  // Additional core methods from Survey (extends SettingSurvey methods)
  applySortOrder(): SurveyInterface
  updateName(name: string): SurveyInterface
  updateTitle(text: string, lang?: string): SurveyInterface

  // Calculation methods for nullable properties
  getLanguage(defaults: SettingSurvey): { default: string; options: string[] }

  getPresentation(defaults: SettingSurvey): {
    format: 'group' | 'question' | 'all'
    noAnswer: boolean
    title: boolean
    welcomeMessage: boolean
    progressBar: boolean
    questionCount: boolean
    groupName: boolean
    groupDesc: boolean
    questionNum: boolean
    questionCode: boolean
    questionIndex: boolean
    backNav: boolean
    redirectEnd: boolean
    navDelay: number
    print: boolean
    stats: boolean
    noBrand: boolean
    thankYouLink: boolean
  }
  getParticipant(defaults: SettingSurvey): {
    htmlEmail: boolean
    thankYouEmail: boolean
    tokenLength: number
  }
  getData(defaults: SettingSurvey): {
    timestamp: boolean
    ip: boolean
    anonymiseIp: boolean
    referrerUrl: boolean
    timings: boolean
    assessment: boolean
  }
  getAccess(defaults: SettingSurvey): {
    anonymous: boolean
    open: boolean
    publicReg: boolean
    index: boolean
    tokenPersist: boolean
    multiple: boolean
    repeatCookie: boolean
    resumeLink: boolean
    captcha: boolean
    captchaReg: boolean
    captchaResume: boolean
  }
  getDataPolicy(defaults: SettingSurvey): {
    show: boolean
    link: boolean
    text: L10n
  }
  getLegalNotice(defaults: SettingSurvey): {
    show: boolean
    link: boolean
    text: L10n
  }
  getSchedule(defaults: SettingSurvey): {
    start: Date
    end: Date
  }
  getNotify(defaults: SettingSurvey): {
    basic: string
    detailed: string
  }
  getContentFormat(defaults: SettingSurvey): {
    htmlAllowed: boolean
    markdownAllowed: boolean
    scriptTagsAllowed: boolean
  }

  // Section methods
  addSection(
    init?: Partial<SurveySectionData>,
    options?: { afterId?: string; lang?: string },
  ): SurveyInterface
  mutateSection(
    sectionId: string,
    mutator: (section: SurveySection) => SurveySection,
  ): SurveyInterface
  updateSection(
    sectionId: string,
    data: Partial<SurveySectionData>,
  ): SurveyInterface
  moveSection(sectionId: string, newIndex: number): SurveyInterface
  deleteSection(sectionId: string): SurveyInterface
  mutateSectionAttributes(
    sectionId: string,
    mutator: (attributes: SurveyAttributes) => SurveyAttributes,
  ): SurveyInterface
  setSectionAttribute(
    sectionId: string,
    attributeId: string,
    value: AttributeValue,
  ): SurveyInterface

  // Question methods
  addQuestion(
    sectionId: string,
    init?: Partial<SurveyQuestionData>,
    options?: { afterId?: string; lang?: string },
  ): SurveyInterface
  mutateQuestion(
    questionId: string,
    mutator: (question: SurveyQuestion) => SurveyQuestion,
  ): SurveyInterface
  updateQuestion(
    questionId: string,
    data: Partial<SurveyQuestionData>,
  ): SurveyInterface
  moveQuestion(
    questionId: string,
    targetSectionId: string,
    newIndex: number,
  ): SurveyInterface
  deleteQuestion(questionId: string): SurveyInterface
  mutateQuestionAttributes(
    questionId: string,
    mutator: (attributes: SurveyAttributes) => SurveyAttributes,
  ): SurveyInterface
  setQuestionAttribute(
    questionId: string,
    attributeId: string,
    value: AttributeValue,
  ): SurveyInterface

  // Subquestion methods
  addSubquestion(
    questionId: string,
    init?: Partial<SurveySubquestionData>,
    afterId?: string,
  ): SurveyInterface
  mutateSubquestion(
    questionId: string,
    subquestionId: string,
    mutator: (subquestion: SurveySubquestion) => SurveySubquestion,
  ): SurveyInterface
  updateSubquestion(
    questionId: string,
    subquestionId: string,
    data: Partial<SurveySubquestionData>,
  ): SurveyInterface
  moveSubquestion(
    questionId: string,
    subquestionId: string,
    newIndex: number,
  ): SurveyInterface
  deleteSubquestion(questionId: string, subquestionId: string): SurveyInterface

  // Answer Option methods
  addAnswerOption(
    questionId: string,
    init?: Partial<SurveyAnswerOptionData>,
    afterId?: string,
  ): SurveyInterface
  mutateAnswerOption(
    questionId: string,
    answerId: string,
    mutator: (answer: SurveyAnswerOption) => SurveyAnswerOption,
  ): SurveyInterface
  updateAnswerOption(
    questionId: string,
    answerId: string,
    data: Partial<SurveyAnswerOptionData>,
  ): SurveyInterface
  updateAnswerOptionLabel(
    questionId: string,
    answerId: string,
    data: Partial<SurveyAnswerOptionData>,
  ): SurveyInterface
  moveAnswerOption(
    questionId: string,
    answerId: string,
    newIndex: number,
  ): SurveyInterface
  deleteAnswerOption(questionId: string, answerId: string): SurveyInterface

  // Welcome / thank-you section methods
  ensureWelcomeSection(): SurveyInterface
  ensureThankYouSection(): SurveyInterface
  updateWelcomeSectionDesc(text: string, lang?: string): SurveyInterface
  updateThankYouSectionDesc(text: string, lang?: string): SurveyInterface
  updateThankYouSectionLinkUrl(url: string, lang?: string): SurveyInterface
  updateThankYouSectionLinkText(text: string, lang?: string): SurveyInterface
  clearThankYouSectionLink(): SurveyInterface
}

// Static methods interface
export interface SurveyInterfaceStatic {
  new (data: Partial<SurveyData>): SurveyInterface
  genSectionId(): string
  genElementId(): string
  genContentId(): string
}
