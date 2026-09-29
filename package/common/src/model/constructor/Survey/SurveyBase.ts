import { genUniqueId } from '@datacapy/id'
import { PropsOf } from '@datacapy/schema'

import { L10n } from '../L10n'
import { ChartType, ChartValueMode } from '../SettingSurvey/SettingSurveyBase'
import { SurveySectionCollection } from './SurveySectionCollection'
import {
  SurveyElementCollection,
  SurveyElementData,
} from './SurveyElementCollection'
import { SurveySectionData, SurveySection } from './SurveySection'
import type { SurveyAttributes } from './attributeMeta'

export interface SurveyData {
  // Base properties from SettingSurvey
  _id: string
  createdAt: Date
  updatedAt: Date

  // Survey-specific properties
  createdById: string
  name: string
  title: PropsOf<L10n>
  attributes: SurveyAttributes
  sections: SurveySectionCollection | Partial<SurveySectionData>[]
  elements: SurveyElementCollection | SurveyElementData[]
  sectionIds?: string[]
  elementIds?: string[]

  // Inherited properties that can now have nullable individual properties
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
    text?: PropsOf<L10n> | null
    url?: PropsOf<L10n> | null
  }
  legalNotice?: {
    show?: boolean | null
    link?: boolean | null
    text?: PropsOf<L10n> | null
    url?: PropsOf<L10n> | null
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
}

export class SurveyBase {
  // Base properties from SettingSurvey
  _id: string
  createdAt: Date = new Date()
  updatedAt: Date = new Date()

  // Survey-specific properties
  createdById: string
  name: string = ''
  title: L10n = new L10n()
  attributes: SurveyAttributes = {}
  sections: SurveySectionCollection = new SurveySectionCollection()
  elements: SurveyElementCollection = new SurveyElementCollection()
  sectionIds: string[] = []
  elementIds: string[] = []

  // Nullable inherited properties (stored as-is for persistence)
  language?: {
    default?: string | null
    options?: string[] | null
  } = { default: null, options: null }
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
  } = {
    format: null,
    noAnswer: null,
    title: null,
    welcomeMessage: null,
    progressBar: null,
    questionCount: null,
    groupName: null,
    groupDesc: null,
    questionNum: null,
    questionCode: null,
    questionIndex: null,
    backNav: null,
    redirectEnd: null,
    navDelay: null,
    print: null,
    stats: null,
    noBrand: null,
    thankYouLink: null,
  }
  participant?: {
    htmlEmail?: boolean | null
    thankYouEmail?: boolean | null
    tokenLength?: number | null
  } = {
    htmlEmail: null,
    thankYouEmail: null,
    tokenLength: null,
  }
  data?: {
    timestamp?: boolean | null
    ip?: boolean | null
    anonymiseIp?: boolean | null
    referrerUrl?: boolean | null
    timings?: boolean | null
    assessment?: boolean | null
  } = {
    timestamp: null,
    ip: null,
    anonymiseIp: null,
    referrerUrl: null,
    timings: null,
    assessment: null,
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
  } = {
    anonymous: null,
    open: null,
    publicReg: null,
    index: null,
    tokenPersist: null,
    multiple: null,
    repeatCookie: null,
    resumeLink: null,
    captcha: null,
    captchaReg: null,
    captchaResume: null,
  }
  dataPolicy?: {
    show?: boolean | null
    link?: boolean | null
    text?: L10n | null
    url?: L10n | null
  } = {
    show: null,
    link: null,
    text: null,
    url: null,
  }
  legalNotice?: {
    show?: boolean | null
    link?: boolean | null
    text?: L10n | null
    url?: L10n | null
  } = {
    show: null,
    link: null,
    text: null,
    url: null,
  }
  schedule?: {
    start?: Date | null
    end?: Date | null
  } = {
    start: null,
    end: null,
  }
  notify?: {
    basic?: string | null
    detailed?: string | null
  } = {
    basic: null,
    detailed: null,
  }
  stats?: {
    questions?: {
      [questionCode: string]: {
        chartType?: ChartType | null
        valueMode?: ChartValueMode | null
      }
    } | null
  } = {
    questions: {},
  }
  contentFormat?: {
    htmlAllowed?: boolean | null
    markdownAllowed?: boolean | null
    scriptTagsAllowed?: boolean | null
  } = {
    htmlAllowed: null,
    markdownAllowed: null,
    scriptTagsAllowed: null,
  }

  constructor(data: Partial<SurveyData> = {}) {
    // Initialize base properties
    this._id = data?._id || genUniqueId()
    this.createdAt = (data?.createdAt && new Date(data.createdAt)) || new Date()
    this.updatedAt = (data?.createdAt && new Date(data.updatedAt)) || new Date()

    this.createdById = data?.createdById
    this.name = data?.name

    // Smart title handling: reuse L10n instance or create new one
    this.title =
      data?.title instanceof L10n ? data.title : new L10n(data?.title)

    // welcome / thank-you text lives on the `welcome` / `thankYou` singleton
    // sections (see `welcomeSection` / `thankYouSection`), not on the survey.

    this.attributes = data?.attributes

    // Store nullable inherited properties as-is for persistence
    this.language = data?.language || this.language
    this.presentation = data?.presentation || this.presentation
    this.participant = data?.participant || this.participant
    this.data = data?.data || this.data
    this.access = data?.access || this.access
    this.contentFormat = data?.contentFormat || this.contentFormat

    // Handle L10n properties in dataPolicy and legalNotice
    if (data?.dataPolicy) {
      this.dataPolicy = {
        ...data.dataPolicy,
        text:
          data.dataPolicy.text instanceof L10n
            ? data.dataPolicy.text
            : data.dataPolicy.text
              ? new L10n(data.dataPolicy.text)
              : null,
        url:
          data.dataPolicy.url instanceof L10n
            ? data.dataPolicy.url
            : data.dataPolicy.url
              ? new L10n(data.dataPolicy.url)
              : null,
      }
    }

    if (data?.legalNotice) {
      this.legalNotice = {
        ...data.legalNotice,
        text:
          data.legalNotice.text instanceof L10n
            ? data.legalNotice.text
            : data.legalNotice.text
              ? new L10n(data.legalNotice.text)
              : null,
        url:
          data.legalNotice.url instanceof L10n
            ? data.legalNotice.url
            : data.legalNotice.url
              ? new L10n(data.legalNotice.url)
              : null,
      }
    }

    this.schedule = data?.schedule
    this.notify = data?.notify
    this.stats = data?.stats || this.stats

    // Smart sections handling: reuse collection instance or process array
    if (data?.sections instanceof SurveySectionCollection) {
      this.sections = data.sections
    } else {
      const processedSections = data?.sections
        ? data.sections.map((section) => {
            section.surveyId = this._id
            section.createdById = section.createdById || this.createdById
            return section
          })
        : []
      this.sections = new SurveySectionCollection().fromArray(processedSections)
    }

    // Smart elements handling: reuse collection instance or process array
    if (data?.elements instanceof SurveyElementCollection) {
      this.elements = data.elements
    } else {
      const processedElements = data?.elements
        ? data.elements.map((element) => {
            element.surveyId = this._id
            element.createdById = element.createdById || this.createdById
            return element
          })
        : []
      this.elements = new SurveyElementCollection().fromArray(processedElements)
    }

    // Smart ID array handling: use provided arrays or generate from collections.
    // Spread to a plain array — `Collection.map()` returns a Collection subclass
    // instance, and a mixin that builds `elementIds` from `collection.map()`
    // (e.g. addQuestion) would otherwise leave a SurveyElementCollection of
    // strings here instead of a `string[]`.
    this.sectionIds = [
      ...(data?.sectionIds?.length
        ? data.sectionIds
        : this.sections.map((section) => section._id)),
    ]
    this.elementIds = [
      ...(data?.elementIds?.length
        ? data.elementIds
        : this.elements.map((e) => e._id)),
    ]

    // Validate that collections are properly initialized
    if (!this.sections || typeof this.sections.getById !== 'function') {
      throw new Error(
        `Survey Base constructor failed to initialize sections collection properly.` +
          ` Type: ${typeof this.sections}, Constructor: ${this.sections?.constructor?.name}`,
      )
    }
    if (!this.elements || typeof this.elements.getById !== 'function') {
      throw new Error(
        `Survey Base constructor failed to initialize elements collection properly.` +
          ` Type: ${typeof this.elements}, Constructor: ${this.elements?.constructor?.name}`,
      )
    }
  }

  get contents(): ReturnType<SurveyElementCollection['contents']> {
    return this.elements.contents()
  }

  /** The singleton welcome section (`kind === 'welcome'`), if present. */
  get welcomeSection(): SurveySection | undefined {
    return this.sections.welcome()
  }

  /** The singleton thank-you section (`kind === 'thankYou'`), if present. */
  get thankYouSection(): SurveySection | undefined {
    return this.sections.thankYou()
  }

  update(data: Partial<SurveyData>): this {
    const Ctor = this.constructor as new (data: Partial<SurveyData>) => this
    return new Ctor({ ...this, ...data })
  }

  setNestedProperty(
    currentValue: Record<string, unknown> | undefined,
    defaultValue: Record<string, unknown>,
    propertyName: string,
    key: string,
    value: unknown,
  ): this {
    const current = currentValue || defaultValue
    const newObject = { ...current, [key]: value }
    return this.newInstance(
      current[key] === value ? {} : { [propertyName]: newObject },
    )
  }

  updateNestedProperty(
    currentValue: Record<string, unknown> | undefined,
    defaultValue: Record<string, unknown>,
    propertyName: string,
    updates: Record<string, unknown>,
  ): this {
    const current = currentValue || defaultValue
    const newObject = { ...current, ...updates }

    // Check if there are any actual changes
    let hasChanges = false
    for (const key in updates) {
      if (current[key] !== updates[key]) {
        hasChanges = true
        break
      }
    }

    return hasChanges ? this.newInstance({ [propertyName]: newObject }) : this
  }

  newInstance(changes?: Partial<SurveyData>): this {
    if (!changes || Object.keys(changes).length === 0) {
      return this
    }
    // Create a new instance by merging current instance data with changes
    // Only pass collection instances for properties that weren't changed
    const mergedData: Partial<SurveyData> = { ...this }

    // Override with any changes provided
    Object.assign(mergedData, changes)

    const Ctor = this.constructor as new (data: Partial<SurveyData>) => this
    return new Ctor(mergedData)
  }
}
