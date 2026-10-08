import { Survey, SettingSurvey, L10n } from 'veysur-common'

export interface SettingsDataAdapter<T> {
  language?: {
    options?: string[] | null
    default?: string | null
  }
  presentation?: {
    format?: string | null
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
    embed?: boolean | null
    embedDomains?: string[] | null
  }
  schedule?: {
    start?: Date | null
    end?: Date | null
  }
  dataPolicy?: {
    show?: boolean | null
    link?: boolean | null
    text?: L10n | null
    url?: L10n | null
  }
  legalNotice?: {
    show?: boolean | null
    link?: boolean | null
    text?: L10n | null
    url?: L10n | null
  }
  notify?: {
    basic?: string | null
    detailed?: string | null
  }
  contentFormat?: {
    htmlAllowed?: boolean | null
    markdownAllowed?: boolean | null
    scriptTagsAllowed?: boolean | null
  }
  getDefault?: <TValue = unknown>(section: string, field: string) => TValue
  getValue?: <TValue = unknown>(section: string, field: string) => TValue
  // The original data source
  source: T
}

export class SurveyAdapter implements SettingsDataAdapter<Survey> {
  constructor(
    public source: Survey,
    public defaults: SettingSurvey,
  ) {}

  get language() {
    return this.source.language
  }

  get presentation() {
    return this.source.presentation
  }

  get participant() {
    return this.source.participant
  }

  get data() {
    return this.source.data
  }

  get access() {
    return this.source.access
  }

  get schedule() {
    return this.source.schedule
  }

  get dataPolicy() {
    return this.source.dataPolicy
  }

  get legalNotice() {
    return this.source.legalNotice
  }

  get notify() {
    return this.source.notify
  }

  get contentFormat() {
    return this.source.contentFormat
  }

  // `Survey` / `SettingSurvey` are class instances with typed section getters,
  // not index maps — this is the one place the dynamic `section.field` lookup
  // crosses into `unknown`, narrowed here rather than cast at each accessor.
  private static readNested(
    root: object,
    section: string,
    field: string,
  ): unknown {
    const sectionValue = (root as Record<string, unknown>)[section]
    return sectionValue && typeof sectionValue === 'object'
      ? (sectionValue as Record<string, unknown>)[field]
      : undefined
  }

  getDefault<TValue = unknown>(section: string, field: string): TValue {
    return SurveyAdapter.readNested(this.defaults, section, field) as TValue
  }

  getValue<TValue = unknown>(section: string, field: string): TValue {
    const surveyValue = SurveyAdapter.readNested(this.source, section, field)
    // Return survey value if defined (including falsy values like false, 0, '')
    // Only fall back to default if undefined or null
    return (surveyValue ?? this.getDefault(section, field)) as TValue
  }
}

export class SettingSurveyAdapter implements SettingsDataAdapter<SettingSurvey> {
  constructor(public source: SettingSurvey) {}

  get language() {
    return this.source.language
  }

  get presentation() {
    return this.source.presentation
  }

  get participant() {
    return this.source.participant
  }

  get data() {
    return this.source.data
  }

  get access() {
    return this.source.access
  }

  get schedule() {
    return this.source.schedule
  }

  get dataPolicy() {
    return this.source.dataPolicy
  }

  get legalNotice() {
    return this.source.legalNotice
  }

  get notify() {
    return this.source.notify
  }

  get contentFormat() {
    return this.source.contentFormat
  }
}

export type SettingsHandlers = {
  handleBooleanChange?: (
    section: string,
    field: string,
    value: string | null,
  ) => void
  handleStringChange?: (
    section: string,
    field: string,
    value: string | null,
  ) => void
  handleNumberChange?: (
    section: string,
    field: string,
    value: string | null,
  ) => void
  handleL10nChange?: (
    section: string,
    field: string,
    value: string | null,
    language?: string,
  ) => void
  handleLanguageOptionsChange?: (selectedLanguages: string[]) => void
  // null = inherit the project default
  handleStringListChange?: (
    section: string,
    field: string,
    value: string[] | null,
  ) => void
}
