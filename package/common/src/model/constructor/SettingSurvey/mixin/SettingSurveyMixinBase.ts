import { ChartType, ChartValueMode } from '../SettingSurveyBase'

/**
 * Minimal contract for the innermost mixin (`SettingSurveyCoreMethods`),
 * which is applied directly to the raw base class and therefore can't
 * assume the nested settings properties or the helper methods it itself
 * provides to every mixin layered on top of it.
 */
export interface HasNewInstance {
  newInstance(changes?: Record<string, unknown>): this
}

/**
 * Standalone (not `Pick`-derived) contract for `updateL10nProperty`, used by
 * mixins outside the SettingSurvey/Survey shared group (WelcomeMethods,
 * ThankYouMethods). Declared fresh rather than as
 * `Pick<SettingSurveyMixinBase, 'updateL10nProperty'>` because `Pick`/`Omit`
 * fix a method's `this` return to the picked-from interface instead of
 * preserving polymorphism for the type doing the picking.
 */
export interface HasUpdateL10nProperty {
  updateL10nProperty(
    currentObject: Record<string, unknown>,
    propertyName: string,
    textPropertyPath: string,
    text: string | null,
    lang?: string,
  ): this
}

/**
 * Structural contract required by the SettingSurvey mixins (Access, Data,
 * DataPolicy, Language, LegalNotice, Notify, Participant, Presentation,
 * Schedule, Stats).
 *
 * These mixins are composed onto two different concrete base classes:
 * `SettingSurveyBase` (standalone settings - fields required/non-null) and
 * `SurveyBase` (embedded in Survey - the same fields are optional/nullable,
 * resolved via defaults at publish time). The property types below use the
 * more permissive (optional/nullable) shape so that both concrete bases -
 * whose fields are each assignable to it - satisfy this constraint.
 */
export interface SettingSurveyMixinBase {
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
  dataPolicy?: Record<string, unknown>
  legalNotice?: Record<string, unknown>
  schedule?: {
    start?: Date | null
    end?: Date | null
  }
  contentFormat?: {
    htmlAllowed?: boolean | null
    markdownAllowed?: boolean | null
    scriptTagsAllowed?: boolean | null
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

  newInstance(changes?: Record<string, unknown>): this
  setNestedProperty(
    currentValue: Record<string, unknown> | undefined,
    defaultValue: Record<string, unknown>,
    propertyName: string,
    key: string,
    value: unknown,
  ): this
  updateNestedProperty(
    currentValue: Record<string, unknown> | undefined,
    defaultValue: Record<string, unknown>,
    propertyName: string,
    updates: Record<string, unknown>,
  ): this
  updateL10nProperty(
    currentObject: Record<string, unknown>,
    propertyName: string,
    textPropertyPath: string,
    text: string | null,
    lang?: string,
  ): this
}
