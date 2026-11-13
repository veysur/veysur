import type { SettingSurveyDocument } from '../../SettingSurveyDocument'
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
/** Every field of a settings group optional and nullable, as `SurveyBase` holds them. */
type Loose<T> = { [K in keyof T]?: T[K] | null }

/** One settings group of {@link SettingSurveyDocument}, loosened. */
type Group<K extends keyof SettingSurveyDocument> = Loose<
  NonNullable<SettingSurveyDocument[K]>
>

export interface SettingSurveyMixinBase {
  language?: Group<'language'>
  presentation?: Group<'presentation'>
  participant?: Group<'participant'>
  data?: Group<'data'>
  access?: Group<'access'>
  dataPolicy?: Record<string, unknown>
  legalNotice?: Record<string, unknown>
  schedule?: Group<'schedule'>
  contentFormat?: Group<'contentFormat'>
  notify?: Group<'notify'>
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
