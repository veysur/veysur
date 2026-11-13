import type { tags as t } from '@datacapy/schema'

import type { L10nData, L10nHtmlData, L10nUrlData } from './EmbeddedSchemaData'
import type {
  ChartType,
  ChartValueMode,
} from './SettingSurvey/SettingSurveyBase'

/** A setting the survey may leave unset: stored as `null`, resolved against the defaults by the constructor. */
type Unset<T> = (T & t.Default<null>) | null

/**
 * The stored shape of the survey settings, which `Survey` embeds. Nearly every
 * field is nullable (`Unset`): `SettingSurveyBase` merges the stored values
 * over its defaults, so `SettingSurveyData` (the resolved shape) has none.
 *
 * @schema settingSurvey construct=SettingSurvey strict
 */
export interface SettingSurveyDocument {
  _id: string & t.Required
  welcome?: { message?: L10nHtmlData }
  thankYou?: {
    message?: L10nHtmlData
    link?: { url?: L10nUrlData; text?: L10nData }
  }
  language?: {
    default: string & t.Required & t.Default<'en'>
    options: string[] & t.Required & t.NotEmpty & t.Default<['en']>
  }
  presentation?: {
    format: Unset<'group' | 'question' | 'all'>
    noAnswer: Unset<boolean>
    title: Unset<boolean>
    welcomeMessage: Unset<boolean>
    progressBar: Unset<boolean>
    questionCount: Unset<boolean>
    groupName: Unset<boolean>
    groupDesc: Unset<boolean>
    questionNum: Unset<boolean>
    questionCode: Unset<boolean>
    questionIndex: Unset<boolean>
    backNav: Unset<boolean>
    redirectEnd: Unset<boolean>
    navDelay: Unset<number>
    print: Unset<boolean>
    stats: Unset<boolean>
    noBrand: Unset<boolean>
    thankYouLink: Unset<boolean>
  }
  participant?: {
    htmlEmail: Unset<boolean>
    thankYouEmail: Unset<boolean>
    tokenLength: Unset<number>
  }
  data?: {
    timestamp: Unset<boolean>
    ip: Unset<boolean>
    anonymiseIp: Unset<boolean>
    referrerUrl: Unset<boolean>
    timings: Unset<boolean>
    assessment: Unset<boolean>
  }
  access?: {
    anonymous: Unset<boolean>
    open: Unset<boolean>
    publicReg: Unset<boolean>
    index: Unset<boolean>
    tokenPersist: Unset<boolean>
    multiple: Unset<boolean>
    preventRepeat: Unset<boolean>
    resumeLink: Unset<boolean>
    botProtection: Unset<boolean>
    embed: Unset<boolean>
    embedDomains: Unset<string[]>
  }
  schedule?: { start: Unset<Date>; end: Unset<Date> }
  contentFormat?: {
    htmlAllowed: Unset<boolean>
    markdownAllowed: Unset<boolean>
    scriptTagsAllowed: Unset<boolean>
  }
  dataPolicy?: {
    show: Unset<boolean>
    link: Unset<boolean>
    text?: L10nHtmlData
    url?: L10nUrlData
  }
  legalNotice?: {
    show: Unset<boolean>
    link: Unset<boolean>
    text?: L10nHtmlData
    url?: L10nUrlData
  }
  notify?: { basic?: string; detailed?: string }
  stats?: {
    questions?: Record<
      string,
      { chartType?: ChartType; valueMode?: ChartValueMode }
    >
  }
  createdAt: Date & t.Default<'now'>
  updatedAt: Date & t.Default<'now'>
}
