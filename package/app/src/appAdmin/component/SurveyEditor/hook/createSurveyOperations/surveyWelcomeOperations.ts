import { BUFFERED_PATCH_ACTION_UPDATE, schemaManager } from 'veysur-common'

import { OperationDependencies } from './type'
import { SURVEY_ENTITY_TYPE_SECTION } from '../../constant'

const l10nHtmlSchema = schemaManager.getSchema('l10nHtml')

export const createSurveyWelcomeOperations = ({
  updateSurveyState,
  validateAndBuffer,
}: OperationDependencies) => ({
  updateSurveyWelcomeMessage: (text: string, lang: string = 'en') => {
    updateSurveyState((s) => {
      s = s.updateWelcomeSectionDesc(text, lang)
      const section = s.welcomeSection
      if (!section) return s
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SECTION,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: section._id,
            data: { kind: 'welcome', desc: section.desc },
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
})
