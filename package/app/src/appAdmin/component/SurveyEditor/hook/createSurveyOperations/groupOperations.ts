import {
  Survey,
  SurveySection,
  BUFFERED_PATCH_ACTION_CREATE,
  BUFFERED_PATCH_ACTION_UPDATE,
  BUFFERED_PATCH_ACTION_DELETE,
  schemaManager,
} from 'veysur-common'
import { stripHtml } from 'common'

import { OperationDependencies } from './type'
import { l10nFieldPatchValue } from './l10nFieldPatch'
import {
  SURVEY_ENTITY_TYPE_SURVEY,
  SURVEY_ENTITY_TYPE_SECTION,
} from '../../constant'

const questionGroupSchema = schemaManager.getSchema('surveySection')
const l10nHtmlSchema = schemaManager.getSchema('l10nHtml')

export const createGroupOperations = ({
  updateSurveyState,
  validateAndBuffer,
  setSurveyFocus,
}: OperationDependencies) => ({
  addSection: (options?: { afterId?: string; lang?: string }) => {
    const id = Survey.genSectionId()
    updateSurveyState((s) => {
      const { afterId, lang } = options || {}
      s = s.addSection({ _id: id }, { afterId, lang })
      const group = s.sections.groups().getById(id)!
      const groupStructural = Object.fromEntries(
        Object.entries({ ...group }).filter(([key]) => key !== 'desc'),
      )
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SECTION,
            action: BUFFERED_PATCH_ACTION_CREATE,
            id: id,
            data: groupStructural,
          },
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: { sectionIds: s.sectionIds },
          },
        ],
      })
      return s
    })
    setSurveyFocus({ entityType: SURVEY_ENTITY_TYPE_SECTION, id })
  },

  updateSection: (sectionId: string, partial: Partial<SurveySection>) =>
    updateSurveyState((s) => {
      s = s.updateSection(sectionId, partial)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SECTION,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: sectionId,
            data: {
              ...partial,
            },
          },
        ],
      })
      return s
    }),

  updateSectionName: (
    sectionId: string,
    name: string,
    lang: string = 'en',
    langDefault?: string,
  ) =>
    updateSurveyState((s) => {
      let g = s.sections.groups().getById(sectionId)
      if (g == undefined) return s
      const strippedName = stripHtml(name)
      g = g.updateName(strippedName, lang, langDefault)
      s = s.updateSection(sectionId, { name: g.name })
      const validationValue = g.name.getLang(lang, langDefault ?? lang)
      const patchName = l10nFieldPatchValue(
        g.name,
        strippedName,
        lang,
        langDefault,
      )
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SECTION,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: sectionId,
            data: { name: patchName },
          },
        ],
        validation: {
          schema: questionGroupSchema,
          path: `name.${lang}`,
          value: validationValue,
          entityType: 'questionGroup',
          entityId: sectionId,
          field: `name.${lang}`,
        },
      })
      return s
    }),

  updateSectionDescription: (
    sectionId: string,
    description: string,
    lang: string = 'en',
    langDefault?: string,
  ) =>
    updateSurveyState((s) => {
      let g = s.sections.groups().getById(sectionId)
      if (g == undefined) return s
      g = g.updateDescription(description, lang, langDefault)
      s = s.updateSection(sectionId, { desc: g.desc })
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SECTION,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: sectionId,
            data: { desc: g.desc },
          },
        ],
        validation: {
          schema: l10nHtmlSchema,
          path: lang,
          value: description,
          entityType: 'questionGroup',
          entityId: sectionId,
          field: `desc.${lang}`,
        },
      })
      return s
    }),

  deleteSectionDescription: (sectionId: string) =>
    updateSurveyState((s) => {
      let g = s.sections.groups().getById(sectionId)
      if (g == undefined) return s
      g = g.deleteDescription()
      s = s.updateSection(sectionId, { desc: g.desc })
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SECTION,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: sectionId,
            data: {
              desc: g.desc,
            },
          },
        ],
      })
      return s
    }),

  moveSection: (sectionId: string, newIndex: number) =>
    updateSurveyState((s) => {
      s = s.moveSection(sectionId, newIndex)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: { sectionIds: s.sectionIds, elementIds: s.elementIds },
          },
        ],
      })
      return s
    }),

  deleteSection: (sectionId: string) => {
    updateSurveyState((s) => {
      s = s.deleteSection(sectionId)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SECTION,
            action: BUFFERED_PATCH_ACTION_DELETE,
            id: sectionId,
            data: null,
          },
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: {
              elementIds: s.elementIds,
              sectionIds: s.sectionIds,
            },
          },
        ],
      })
      return s
    })
    setSurveyFocus(null)
  },

  setSectionAttribute: (
    sectionId: string,
    attributeId: string,
    value: unknown,
  ) =>
    updateSurveyState((s) => {
      s = s.setSectionAttribute(sectionId, attributeId, value)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SECTION,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: sectionId,
            data: {
              [`attributes.${attributeId}`]: value,
            },
          },
        ],
      })
      return s
    }),
})
