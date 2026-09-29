// cspell:ignore Youtube
import { PropsOf } from '@datacapy/schema'

import { L10n } from '../L10n'
import { SurveyElementBase, SurveyElementBaseData } from './SurveyElementBase'

/**
 * Content type constants — namespaced for future growth
 * (`contentImage`, `contentGallery`, `contentVideoS3` come later).
 */
export const CONTENT_TYPE_TEXT = 'contentText'
export const CONTENT_TYPE_YOUTUBE = 'contentVideoYoutube'

export const CONTENT_TYPES = [CONTENT_TYPE_TEXT, CONTENT_TYPE_YOUTUBE] as const

export type ContentType = (typeof CONTENT_TYPES)[number]

export const CONTENT_CODE_PREFIX = 'C'

export const ELEMENT_KIND_CONTENT = 'content'

export interface SurveyContentConfig {
  youtube?: {
    url?: string
    videoId?: string
    startAt?: number | null
  } | null
  [key: string]: unknown
}

export interface SurveyContentData extends SurveyElementBaseData {
  kind: typeof ELEMENT_KIND_CONTENT
  /** Rich-text body (contentText) or optional caption (YouTube). */
  text: PropsOf<L10n>
  /** Content-element config (e.g. `{ youtube: { url, videoId, startAt } }`). */
  config: SurveyContentConfig | null
}

/**
 * A non-interactive leaf placed inside a section, alongside questions in the
 * survey's ordered element list. Receives no participant input: never validated,
 * never a stats column, never an `answers.*` condition/expression target.
 *
 * Mirrors `SurveyQuestion` minus `answerOptions` / `subquestions`; both share
 * `SurveyElementBase`.
 */
export class SurveyContent extends SurveyElementBase {
  kind: typeof ELEMENT_KIND_CONTENT = ELEMENT_KIND_CONTENT
  config: SurveyContentConfig | null = null

  constructor(data: Partial<SurveyContentData> = {}) {
    super(data)
    this.kind = ELEMENT_KIND_CONTENT
    this.type = data?.type || CONTENT_TYPE_TEXT
    this.config = data?.config ?? null
  }

  setConfig(config: SurveyContentConfig | null): SurveyContent {
    return this.withChanges({ config })
  }
}

/**
 * Type guard: narrows a survey element (or any `{ kind }`-bearing value) to
 * `SurveyContent`. Canonical discriminator — prefer over ad-hoc
 * `x.kind === ELEMENT_KIND_CONTENT` checks so a future kind rename is a single edit.
 */
export const isSurveyContent = (
  el: { kind?: string } | null | undefined,
): el is SurveyContent => el?.kind === ELEMENT_KIND_CONTENT
