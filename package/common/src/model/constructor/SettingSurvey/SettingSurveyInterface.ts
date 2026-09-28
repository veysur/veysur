import { PropsOf } from 'mzen-schema'

import { L10n } from '../L10n'
import {
  SettingSurveyData,
  ChartType,
  ChartValueMode,
} from './SettingSurveyBase'

/**
 * Data properties only (no methods). Kept separate from
 * SettingSurveyMethods so that SurveyInterface can `Omit` and redeclare
 * individual properties with nullable variants without going through a
 * mapped type that would also strip the polymorphic `this` return type off
 * every inherited method (a documented TS limitation: Pick/Omit break
 * `this` types even for members outside the picked/omitted key list).
 */
export interface SettingSurveyProperties {
  _id: string
  language: {
    default: string
    options: string[]
  }
  presentation: {
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
  participant: {
    htmlEmail: boolean
    thankYouEmail: boolean
    tokenLength: number
  }
  data: {
    timestamp: boolean
    ip: boolean
    anonymiseIp: boolean
    referrerUrl: boolean
    timings: boolean
    assessment: boolean
  }
  access: {
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
  dataPolicy: {
    show: boolean
    link: boolean
    text: L10n
    url: L10n
  }
  legalNotice: {
    show: boolean
    link: boolean
    text: L10n
    url: L10n
  }
  schedule: {
    start: Date | null
    end: Date | null
  }
  notify: {
    basic: string
    detailed: string
  }
  stats: {
    questions: {
      [questionCode: string]: {
        chartType: ChartType
        valueMode?: ChartValueMode
      }
    }
  }
  contentFormat: {
    htmlAllowed: boolean
    markdownAllowed: boolean
    scriptTagsAllowed: boolean
  }
  createdAt: Date
  updatedAt: Date
}

/**
 * Methods only. Inherited directly (`extends`, never through Omit/Pick) so
 * that every extending interface (e.g. SurveyInterface) gets `this` bound
 * to itself rather than fixed to SettingSurveyInterface.
 */
export interface SettingSurveyMethods {
  // Core methods
  update(data: Partial<PropsOf<SettingSurveyData>>): this

  // Language methods
  setLanguageProperty(key: string, value: unknown): this
  addLanguageOption(language: string): this
  removeLanguageOption(language: string): this
  setLanguageOptions(options: string[]): this

  // Presentation methods
  setPresentationProperty(key: string, value: unknown): this
  updatePresentation(updates: Record<string, unknown>): this

  // Participant methods
  setParticipantProperty(key: string, value: unknown): this
  updateParticipant(updates: Record<string, unknown>): this

  // Data methods
  setDataProperty(key: string, value: unknown): this
  updateData(updates: Record<string, unknown>): this

  // Access methods
  setAccessProperty(key: string, value: unknown): this
  updateAccess(updates: Record<string, unknown>): this

  // Data Policy methods
  setDataPolicyProperty(key: string, value: unknown): this
  updateDataPolicy(updates: Record<string, unknown>): this
  updateDataPolicyText(text: string, lang?: string): this
  updateDataPolicyUrl(url: string, lang?: string): this

  // Legal Notice methods
  setLegalNoticeProperty(key: string, value: unknown): this
  updateLegalNotice(updates: Record<string, unknown>): this
  updateLegalNoticeText(text: string, lang?: string): this
  updateLegalNoticeUrl(url: string, lang?: string): this

  // Schedule methods
  setScheduleProperty(key: string, value: unknown): this
  updateSchedule(updates: Record<string, unknown>): this

  // Notify methods
  setNotifyProperty(key: string, value: unknown): this
  updateNotify(updates: Record<string, unknown>): this

  // Content format methods
  setContentFormatProperty(key: string, value: unknown): this
  updateContentFormat(updates: Record<string, unknown>): this

  // Stats methods
  setStatsQuestionProperty(
    questionCode: string,
    key: string,
    value: unknown,
  ): this
  updateStatsQuestion(
    questionCode: string,
    updates: Record<string, unknown>,
  ): this
  setStatsQuestionChartType(questionCode: string, chartType: ChartType): this
}

export interface SettingSurveyInterface
  extends SettingSurveyProperties, SettingSurveyMethods {}

// Static methods interface
export interface SettingSurveyInterfaceStatic {
  new (data: Partial<SettingSurveyData>): SettingSurveyInterface
}
