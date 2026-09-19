import {
  Survey,
  BUFFERED_PATCH_ACTION_UPDATE,
  schemaManager,
} from 'veysur-common'
import { stripHtml } from 'common'

import { OperationDependencies } from './type'
import { SURVEY_ENTITY_TYPE_SURVEY } from '../../constant'

const surveySchema = schemaManager.getSchema('survey')

export const createSurveyOperations = ({
  updateSurveyState,
  validateAndBuffer,
}: OperationDependencies) => ({
  updateSurvey: (data: Partial<Survey>) => {
    updateSurveyState((s) => {
      s = s.update({ ...data })
      // No validation config = immediate buffer (complex object updates)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: { ...data },
          },
        ],
      })
      return s
    })
  },

  updateSurveyName: (name: string) => {
    updateSurveyState((s) => {
      const strippedName = stripHtml(name)
      s = s.updateName(strippedName)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: { name: s.name },
          },
        ],
        validation: {
          schema: surveySchema,
          path: 'name',
          value: strippedName,
          entityType: 'survey',
          entityId: s._id,
          field: 'name',
        },
      })
      return s
    })
  },

  updateSurveyTitle: (title: string, lang: string = 'en') => {
    updateSurveyState((s) => {
      s = s.updateTitle(title, lang)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: { title: s.title },
          },
        ],
        validation: {
          schema: surveySchema,
          path: `title.${lang}`,
          value: title,
          entityType: 'survey',
          entityId: s._id,
          field: `title.${lang}`,
        },
      })
      return s
    })
  },
})
