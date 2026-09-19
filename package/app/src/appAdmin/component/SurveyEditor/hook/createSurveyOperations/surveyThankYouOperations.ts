// cspell:ignore Nulled unsets
import {
  BUFFERED_PATCH_ACTION_UPDATE,
  schemaManager,
  L10n,
} from 'veysur-common'

import { OperationDependencies } from './type'
import { SURVEY_ENTITY_TYPE_SECTION } from '../../constant'

const l10nHtmlSchema = schemaManager.getSchema('l10nHtml')
const l10nSchema = schemaManager.getSchema('l10n')

// The server only clears a language's stored value when it is explicitly
// sent as `null` — a language simply missing from the payload is treated as
// "no change", not "remove this language". L10n.setLang/unsetLang delete the
// key locally (so getLang's fallback logic behaves correctly), which loses
// that distinction. Re-add an explicit `null` for every language present
// in `previous` but no longer present in `next` so the wire patch actually
// tells the server which per-language values to unset.
function withRemovedLangsNulled(
  previous: L10n,
  next: L10n,
): Record<string, string | null> {
  const merged: Record<string, string | null> = {}
  for (const lang of Object.keys(next)) {
    merged[lang] = next[lang] as string
  }
  for (const lang of Object.keys(previous)) {
    if (!(lang in merged)) merged[lang] = null
  }
  return merged
}

const thankYouLinkL10n = (
  link?: {
    url?: unknown
    text?: unknown
  } | null,
) => ({
  url: new L10n(
    (link?.url ?? undefined) as ConstructorParameters<typeof L10n>[0],
  ),
  text: new L10n(
    (link?.text ?? undefined) as ConstructorParameters<typeof L10n>[0],
  ),
})

export const createSurveyCompleteOperations = ({
  updateSurveyState,
  validateAndBuffer,
}: OperationDependencies) => ({
  updateSurveyThankYouMessage: (text: string, lang: string = 'en') => {
    updateSurveyState((s) => {
      s = s.updateThankYouSectionDesc(text, lang)
      const section = s.thankYouSection
      if (!section) return s
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SECTION,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: section._id,
            data: { kind: 'thankYou', desc: section.desc },
          },
        ],
        validation: {
          schema: l10nHtmlSchema,
          path: lang,
          value: text,
          entityType: 'questionGroup',
          entityId: section._id,
          field: `desc.${lang}`,
        },
      })
      return s
    })
  },

  updateSurveyThankYouLinkUrl: (url: string, lang: string = 'en') => {
    updateSurveyState((s) => {
      const previousUrl = thankYouLinkL10n(s.thankYouSection?.config?.link).url
      s = s.updateThankYouSectionLinkUrl(url, lang)
      const section = s.thankYouSection
      if (!section) return s
      const nextLink = thankYouLinkL10n(s.thankYouSection?.config?.link)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SECTION,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: section._id,
            data: {
              kind: 'thankYou',
              config: {
                ...section.config,
                link: {
                  text: nextLink.text,
                  url: withRemovedLangsNulled(previousUrl, nextLink.url),
                },
              },
            },
          },
        ],
        validation: {
          schema: l10nSchema,
          path: lang,
          value: url,
          entityType: 'questionGroup',
          entityId: section._id,
          field: `config.link.url.${lang}`,
        },
      })
      return s
    })
  },

  updateSurveyThankYouLinkText: (text: string, lang: string = 'en') => {
    updateSurveyState((s) => {
      const previousText = thankYouLinkL10n(
        s.thankYouSection?.config?.link,
      ).text
      s = s.updateThankYouSectionLinkText(text, lang)
      const section = s.thankYouSection
      if (!section) return s
      const nextLink = thankYouLinkL10n(s.thankYouSection?.config?.link)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SECTION,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: section._id,
            data: {
              kind: 'thankYou',
              config: {
                ...section.config,
                link: {
                  url: nextLink.url,
                  text: withRemovedLangsNulled(previousText, nextLink.text),
                },
              },
            },
          },
        ],
        validation: {
          schema: l10nSchema,
          path: lang,
          value: text,
          entityType: 'questionGroup',
          entityId: section._id,
          field: `config.link.text.${lang}`,
        },
      })
      return s
    })
  },

  clearSurveyThankYouLink: () => {
    updateSurveyState((s) => {
      const section = s.thankYouSection
      if (!section?.config?.link) return s
      s = s.clearThankYouSectionLink()
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SECTION,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: section._id,
            data: { kind: 'thankYou', config: { link: null } },
          },
        ],
      })
      return s
    })
  },
})
