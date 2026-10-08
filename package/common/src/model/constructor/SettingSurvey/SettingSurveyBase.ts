import { genUniqueId } from '@datacapy/id'
import { PropsOf } from '@datacapy/schema'

import { L10n } from '../L10n'

export type ChartType =
  'bar' | 'horizontalBar' | 'pie' | 'stackedBar' | 'pieGrid' | 'averageRank'

// Single source of truth for the chart-type whitelist. Consumed by the survey
// setting schema (`SchemaSettingSurvey`) so the accepted values can never drift
// from the `ChartType` union.
export const ALL_CHART_TYPES: ChartType[] = [
  'bar',
  'horizontalBar',
  'pie',
  'stackedBar',
  'pieGrid',
  'averageRank',
]

// Whether a stats chart plots raw response counts or percentages. Persisted
// per question alongside `chartType`; `ALL_CHART_VALUE_MODES` drives the schema
// whitelist.
export type ChartValueMode = 'count' | 'percentage'

export const ALL_CHART_VALUE_MODES: ChartValueMode[] = ['count', 'percentage']

// Merge `incoming` over `defaults`, keeping the default for any key whose incoming
// value is null/undefined (schema validation fills unset fields with null).
function mergeDefined<T extends object>(
  defaults: T,
  incoming: Partial<T> | undefined,
): T {
  if (!incoming) {
    return defaults
  }
  const merged = { ...defaults }
  for (const key of Object.keys(incoming) as (keyof T)[]) {
    if (incoming[key] !== null && incoming[key] !== undefined) {
      merged[key] = incoming[key] as T[keyof T]
    }
  }
  return merged
}

export interface SettingSurveyData {
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
    embed: boolean
    embedDomains: string[]
  }
  dataPolicy: {
    show: boolean
    link: boolean
    text: PropsOf<L10n>
    url: PropsOf<L10n>
  }
  legalNotice: {
    show: boolean
    link: boolean
    text: PropsOf<L10n>
    url: PropsOf<L10n>
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

export class SettingSurveyBase {
  _id: string
  language: {
    default: string
    options: string[]
  } = { default: 'en', options: ['en'] }
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
  } = {
    format: 'group',
    noAnswer: true,
    title: false,
    welcomeMessage: false,
    progressBar: true,
    questionCount: true,
    groupName: false,
    groupDesc: false,
    questionNum: false,
    questionCode: false,
    questionIndex: false,
    backNav: false,
    redirectEnd: false,
    navDelay: 0,
    print: false,
    stats: false,
    noBrand: false,
    thankYouLink: false,
  }
  participant: {
    htmlEmail: boolean
    thankYouEmail: boolean
    tokenLength: number
  } = {
    htmlEmail: true,
    thankYouEmail: true,
    tokenLength: 16,
  }
  data: {
    timestamp: boolean
    ip: boolean
    anonymiseIp: boolean
    referrerUrl: boolean
    timings: boolean
    assessment: boolean
  } = {
    timestamp: true,
    ip: false,
    anonymiseIp: false,
    referrerUrl: false,
    timings: false,
    assessment: false,
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
    embed: boolean
    embedDomains: string[]
  } = {
    anonymous: false,
    open: false,
    publicReg: false,
    index: false,
    tokenPersist: true,
    multiple: false,
    repeatCookie: false,
    resumeLink: false,
    captcha: false,
    captchaReg: false,
    captchaResume: false,
    embed: false,
    embedDomains: [],
  }
  dataPolicy: {
    show: boolean
    link: boolean
    text: L10n
    url: L10n
  } = {
    show: false,
    link: false,
    text: new L10n(),
    url: new L10n(),
  }
  legalNotice: {
    show: boolean
    link: boolean
    text: L10n
    url: L10n
  } = {
    show: false,
    link: false,
    text: new L10n(),
    url: new L10n(),
  }
  schedule: {
    start: Date | null
    end: Date | null
  } = {
    start: null,
    end: null,
  }
  notify: {
    basic: string
    detailed: string
  } = {
    basic: '',
    detailed: '',
  }
  stats: {
    questions: {
      [questionCode: string]: {
        chartType: ChartType
        valueMode?: ChartValueMode
      }
    }
  } = {
    questions: {},
  }
  contentFormat: {
    htmlAllowed: boolean
    markdownAllowed: boolean
    scriptTagsAllowed: boolean
  } = {
    htmlAllowed: false,
    markdownAllowed: true,
    scriptTagsAllowed: false,
  }
  createdAt: Date
  updatedAt: Date

  constructor(data: Partial<SettingSurveyData> = {}) {
    this._id = data?._id || genUniqueId()

    this.language = data?.language || this.language

    // Merge per-key rather than replacing wholesale: a schema-validated document
    // fills unset fields with null (see SchemaSettingSurvey.ts), so a full-object
    // replace would overwrite these hardcoded defaults with nulls for any field
    // the project has never explicitly set.
    this.presentation = mergeDefined(this.presentation, data?.presentation)
    this.participant = mergeDefined(this.participant, data?.participant)
    this.data = mergeDefined(this.data, data?.data)
    this.access = mergeDefined(this.access, data?.access)

    // Smart dataPolicy handling: reuse instances or create new ones with proper L10n text/url
    if (data?.dataPolicy) {
      this.dataPolicy = {
        ...this.dataPolicy,
        ...data.dataPolicy,
        text:
          data.dataPolicy.text instanceof L10n
            ? data.dataPolicy.text
            : new L10n(data.dataPolicy.text),
        url:
          data.dataPolicy.url instanceof L10n
            ? data.dataPolicy.url
            : new L10n(data.dataPolicy.url),
      }
    }

    // Smart legalNotice handling: reuse instances or create new ones with proper L10n text/url
    if (data?.legalNotice) {
      this.legalNotice = {
        ...this.legalNotice,
        ...data.legalNotice,
        text:
          data.legalNotice.text instanceof L10n
            ? data.legalNotice.text
            : new L10n(data.legalNotice.text),
        url:
          data.legalNotice.url instanceof L10n
            ? data.legalNotice.url
            : new L10n(data.legalNotice.url),
      }
    }

    this.schedule = data?.schedule || this.schedule
    this.notify = data?.notify || this.notify
    this.stats = data?.stats || this.stats
    this.contentFormat = mergeDefined(this.contentFormat, data?.contentFormat)

    this.createdAt = (data?.createdAt && new Date(data.createdAt)) || new Date()
    this.updatedAt = (data?.createdAt && new Date(data.updatedAt)) || new Date()
  }

  newInstance(changes?: Partial<SettingSurveyData>): this {
    if (!changes || Object.keys(changes).length === 0) {
      return this
    }
    // Create a new instance by merging current instance data with changes
    const mergedData: Partial<SettingSurveyData> = { ...this }

    // Override with any changes provided
    Object.assign(mergedData, changes)

    const Ctor = this.constructor as new (
      data: Partial<SettingSurveyData>,
    ) => this
    return new Ctor(mergedData)
  }
}
