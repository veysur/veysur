import { genUniqueId } from 'mzen-id'
import { PropsOf } from 'mzen-schema'

import { L10n, setL10nField } from '../L10n'
import { ImmutableEntity } from './ImmutableEntity'
import { entityConditionMethods } from './mixin/entityConditionMethods'
import { entityAttributeMethods } from './mixin/entityAttributeMethods'
import type { SurveyAttributes } from './attributeMeta'

export const SECTION_KIND_WELCOME = 'welcome'
export const SECTION_KIND_GROUP = 'group'
export const SECTION_KIND_THANK_YOU = 'thankYou'

/** Sentinel codes for the singleton welcome / thank-you sections. */
export const SECTION_CODE_WELCOME = 'WELCOME'
export const SECTION_CODE_THANK_YOU = 'THANKYOU'

export type SectionKind =
  | typeof SECTION_KIND_WELCOME
  | typeof SECTION_KIND_GROUP
  | typeof SECTION_KIND_THANK_YOU

/** Default display-name label used when a section is created without a name. */
export const SECTION_KIND_DEFAULT_NAME_LABEL: Record<SectionKind, string> = {
  [SECTION_KIND_WELCOME]: 'Welcome',
  [SECTION_KIND_GROUP]: 'Group',
  [SECTION_KIND_THANK_YOU]: 'Thank you',
}

/**
 * True for an ordinary content section (not the singleton welcome / thank-you
 * sections). A missing `kind` is treated as a group — legacy rows predate the
 * field, whose schema default is `'group'`.
 */
export const isGroupSection = (section: { kind?: string | null }): boolean =>
  section.kind !== SECTION_KIND_WELCOME &&
  section.kind !== SECTION_KIND_THANK_YOU

export interface SurveySectionConfig {
  link?: {
    url: PropsOf<L10n>
    text: PropsOf<L10n>
  } | null
  [key: string]: unknown
}

export interface SurveySectionData {
  _id: string
  surveyId: string
  createdById: string
  kind: SectionKind
  code: string
  name: PropsOf<L10n>
  desc: PropsOf<L10n> | null
  attributes: SurveyAttributes
  config: SurveySectionConfig | null
  condition: string | null
  conditionReferences: string[] | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Section fields plus the section-specific mutators. The shared visibility-
 * condition and attribute mutators come from `entityConditionMethods` /
 * `entityAttributeMethods` (see the export below).
 */
class SurveySectionCore extends ImmutableEntity {
  _id: string
  surveyId: string
  createdById: string
  kind: SectionKind = SECTION_KIND_GROUP
  code: string
  name: L10n = new L10n()
  desc: L10n | null
  attributes: SurveyAttributes = {}
  config: SurveySectionConfig | null = null
  condition: string | null
  conditionReferences: string[] | null
  createdAt: Date
  updatedAt: Date

  constructor(data: Partial<SurveySectionData>) {
    super()
    this._id = data?._id || genUniqueId()
    this.surveyId = data?.surveyId
    this.createdById = data?.createdById
    this.kind = data?.kind || SECTION_KIND_GROUP
    this.code = data?.code || ''
    this.name = new L10n(data?.name)
    this.desc = (data?.desc && new L10n(data?.desc)) || null
    this.attributes = data?.attributes
    this.config = data?.config ?? null
    this.condition = data?.condition ?? null
    this.conditionReferences = data?.conditionReferences ?? null
    this.createdAt = new Date(data?.createdAt)
    this.updatedAt = new Date(data?.updatedAt)
  }

  updateName(
    text: string,
    language: string = 'en',
    defaultLanguage?: string,
  ): this {
    return this.withChanges({
      name: setL10nField(this.name, text, language, defaultLanguage),
    })
  }

  updateDescription(
    text: string,
    language: string = 'en',
    defaultLanguage?: string,
  ): this {
    return this.withChanges({
      desc: setL10nField(this.desc, text, language, defaultLanguage),
    })
  }

  deleteDescription(): this {
    return this.withChanges({ desc: null })
  }

  setConfig(config: SurveySectionConfig | null): this {
    return this.withChanges({ config })
  }

  /** Merge one language's value into `config.link.url` / `.text` (thank-you section). */
  setConfigLink(
    field: 'url' | 'text',
    value: string,
    language: string = 'en',
    defaultLanguage?: string,
  ): this {
    const link = this.config?.link ?? { url: {}, text: {} }
    return this.withChanges({
      config: {
        ...this.config,
        link: {
          url: link.url,
          text: link.text,
          [field]: setL10nField(
            new L10n(link[field]),
            value,
            language,
            defaultLanguage,
          ),
        },
      },
    })
  }

  clearConfigLink(): this {
    if (!this.config?.link) return this
    const { link: _link, ...rest } = this.config
    return this.withChanges({
      config: Object.keys(rest).length ? rest : null,
    })
  }
}

export class SurveySection extends entityConditionMethods(
  entityAttributeMethods(SurveySectionCore),
) {}
