import {
  Survey,
  SurveyContentConfig,
  BUFFERED_PATCH_ACTION_CREATE,
  BUFFERED_PATCH_ACTION_UPDATE,
  BUFFERED_PATCH_ACTION_DELETE,
  schemaManager,
  parseYoutubeUrl,
  CONTENT_TYPE_YOUTUBE,
} from 'veysur-common'

import { OperationDependencies } from './type'
import { l10nFieldPatchValue } from './l10nFieldPatch'
import {
  SURVEY_ENTITY_TYPE_SURVEY,
  SURVEY_ENTITY_TYPE_CONTENT,
} from '../../constant'

// cspell:ignore unparseable
const l10nHtmlSchema = schemaManager.getSchema('l10nHtml')

// The element collection is typed as `SurveyQuestion` for legacy structural
// compatibility; content elements live there at runtime. Look them up through
// the `contents` view to read content-specific fields (`config`, `text`).
const contentEl = (s: Survey, id: string) =>
  s.contents.find((c) => c._id === id)

/**
 * Editor operations for content elements — the non-interactive leaves
 * interleaved with questions in the ordered element list. Mirrors
 * `questionOperations.ts`: a structural change emits a `content` patch
 * plus a `survey { elementIds }` patch; a text/config edit emits one patch.
 */
export const createContentOperations = ({
  updateSurveyState,
  validateAndBuffer,
  setSurveyFocus,
}: OperationDependencies) => {
  // Shared body for the three move variants: apply the model move, then emit the
  // element `sectionId` patch + the survey `elementIds` order patch.
  const bufferMove = (elementId: string, apply: (s: Survey) => Survey) =>
    updateSurveyState((s) => {
      s = apply(s)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_CONTENT,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: elementId,
            data: { sectionId: s.elements.getById(elementId)?.sectionId },
          },
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: { elementIds: s.elementIds },
          },
        ],
      })
      return s
    })

  return {
    addContent: (
      sectionId: string,
      options?: { type?: string; afterId?: string; lang?: string },
    ) => {
      const id = Survey.genContentId()
      updateSurveyState((s) => {
        const { type, afterId, lang } = options || {}
        s = s.addContent(
          sectionId,
          { _id: id, ...(type && { type }) },
          { afterId, lang },
        )
        const created = s.elements.getById(id)!
        const {
          text: _text,
          groupId: _groupId,
          ...structural
        } = {
          ...(created as unknown as Record<string, unknown>),
        }
        void _text
        void _groupId
        validateAndBuffer({
          patches: [
            {
              type: SURVEY_ENTITY_TYPE_CONTENT,
              action: BUFFERED_PATCH_ACTION_CREATE,
              id,
              data: { ...structural, sectionId },
            },
            {
              type: SURVEY_ENTITY_TYPE_SURVEY,
              action: BUFFERED_PATCH_ACTION_UPDATE,
              id: s._id,
              data: { elementIds: s.elementIds },
            },
          ],
        })
        return s
      })
      setSurveyFocus({ entityType: SURVEY_ENTITY_TYPE_CONTENT, id })
    },

    updateContentText: (
      elementId: string,
      text: string,
      lang: string = 'en',
      langDefault?: string,
    ) =>
      updateSurveyState((s) => {
        s = s.updateContentText(elementId, text, lang, langDefault)
        const updatedText = contentEl(s, elementId)?.text
        const patchText = l10nFieldPatchValue(
          updatedText,
          text,
          lang,
          langDefault,
        )
        validateAndBuffer({
          patches: [
            {
              type: SURVEY_ENTITY_TYPE_CONTENT,
              action: BUFFERED_PATCH_ACTION_UPDATE,
              id: elementId,
              data: { text: patchText },
            },
          ],
          validation: {
            schema: l10nHtmlSchema,
            path: lang,
            value: text,
            entityType: 'content',
            entityId: elementId,
            field: `text.${lang}`,
          },
        })
        return s
      }),

    /**
     * Change a content element's type (e.g. Text content ↔ Video (YouTube)).
     * Switching away from YouTube also clears `config` so a stale
     * `config.youtube` can't linger on a text element. One `content` UPDATE patch.
     */
    updateContentType: (elementId: string, type: string) =>
      updateSurveyState((s) => {
        const clearConfig = type !== CONTENT_TYPE_YOUTUBE
        s = s.updateContent(elementId, {
          type,
          ...(clearConfig ? { config: null } : {}),
        })
        validateAndBuffer({
          patches: [
            {
              type: SURVEY_ENTITY_TYPE_CONTENT,
              action: BUFFERED_PATCH_ACTION_UPDATE,
              id: elementId,
              data: {
                type,
                ...(clearConfig ? { config: null } : {}),
              },
            },
          ],
        })
        return s
      }),

    updateContentCode: (elementId: string, code: string) =>
      updateSurveyState((s) => {
        s = s.updateContent(elementId, { code })
        validateAndBuffer({
          patches: [
            {
              type: SURVEY_ENTITY_TYPE_CONTENT,
              action: BUFFERED_PATCH_ACTION_UPDATE,
              id: elementId,
              data: { code: contentEl(s, elementId)?.code ?? code },
            },
          ],
        })
        return s
      }),

    setContentConfig: (elementId: string, config: SurveyContentConfig | null) =>
      updateSurveyState((s) => {
        s = s.setContentConfig(elementId, config)
        validateAndBuffer({
          patches: [
            {
              type: SURVEY_ENTITY_TYPE_CONTENT,
              action: BUFFERED_PATCH_ACTION_UPDATE,
              id: elementId,
              data: { config: contentEl(s, elementId)?.config ?? null },
            },
          ],
        })
        return s
      }),

    /**
     * Parse a pasted YouTube URL and store the derived `{ url, videoId, startAt }`
     * as `config.youtube`. An unparseable URL still stores the raw `url` (with
     * `videoId` cleared) so the editor can show an inline error.
     */
    setContentYoutubeUrl: (elementId: string, url: string) =>
      updateSurveyState((s) => {
        const parsed = parseYoutubeUrl(url)
        const existing = contentEl(s, elementId)?.config?.youtube ?? {}
        const youtube = parsed
          ? { url, videoId: parsed.videoId, startAt: parsed.startAt }
          : { ...existing, url, videoId: undefined }
        s = s.setContentConfig(elementId, { youtube })
        validateAndBuffer({
          patches: [
            {
              type: SURVEY_ENTITY_TYPE_CONTENT,
              action: BUFFERED_PATCH_ACTION_UPDATE,
              id: elementId,
              data: { config: contentEl(s, elementId)?.config ?? null },
            },
          ],
        })
        return s
      }),

    updateContentCondition: (elementId: string, condition: string | null) =>
      updateSurveyState((s) => {
        s = s.updateContentCondition(elementId, condition)
        validateAndBuffer({
          patches: [
            {
              type: SURVEY_ENTITY_TYPE_CONTENT,
              action: BUFFERED_PATCH_ACTION_UPDATE,
              id: elementId,
              data: {
                condition: s.elements.getById(elementId)?.condition ?? null,
                conditionReferences:
                  s.elements.getById(elementId)?.conditionReferences ?? null,
              },
            },
          ],
        })
        return s
      }),

    setContentAttribute: (
      elementId: string,
      attributeId: string,
      value: unknown,
    ) =>
      updateSurveyState((s) => {
        s = s.updateContent(elementId, {
          attributes: {
            ...(contentEl(s, elementId)?.attributes || {}),
            [attributeId]: value,
          },
        })
        validateAndBuffer({
          patches: [
            {
              type: SURVEY_ENTITY_TYPE_CONTENT,
              action: BUFFERED_PATCH_ACTION_UPDATE,
              id: elementId,
              data: { [`attributes.${attributeId}`]: value },
            },
          ],
        })
        return s
      }),

    moveContent: (
      elementId: string,
      targetSectionId: string,
      newIndex: number,
    ) =>
      bufferMove(elementId, (s) =>
        s.moveContent(elementId, targetSectionId, newIndex),
      ),

    moveContentUp: (elementId: string) =>
      bufferMove(elementId, (s) => s.moveContentUp(elementId)),

    moveContentDown: (elementId: string) =>
      bufferMove(elementId, (s) => s.moveContentDown(elementId)),

    deleteContent: (elementId: string) => {
      updateSurveyState((s) => {
        s = s.deleteContent(elementId)
        validateAndBuffer({
          patches: [
            {
              type: SURVEY_ENTITY_TYPE_CONTENT,
              action: BUFFERED_PATCH_ACTION_DELETE,
              id: elementId,
              data: null,
            },
            {
              type: SURVEY_ENTITY_TYPE_SURVEY,
              action: BUFFERED_PATCH_ACTION_UPDATE,
              id: s._id,
              data: { elementIds: s.elementIds },
            },
          ],
        })
        return s
      })
      setSurveyFocus(null)
    },
  }
}
