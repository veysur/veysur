import { useMemo } from 'react'
import { SurveyEntity } from 'veysur-common'

import {
  SurveyFocus,
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
} from 'appAdmin/component/SurveyEditor'

import {
  AttributeSetConfig,
  getAttributeSets,
  getAttributes,
} from '../attributesConfig'

export const useAttributeSets = (
  entity?: SurveyEntity,
  surveyFocus?: SurveyFocus,
): AttributeSetConfig[] => {
  return useMemo(() => {
    const attributeSets =
      surveyFocus?.entityType === undefined
        ? []
        : getAttributeSets(surveyFocus?.entityType)

    return attributeSets
      .map((setConfig) => {
        const attributes = getAttributes(
          setConfig.attributeIds,
          surveyFocus?.entityType,
          (surveyFocus?.entityType === SURVEY_ENTITY_TYPE_ELEMENT ||
            surveyFocus?.entityType === SURVEY_ENTITY_TYPE_SUBQUESTION) &&
            entity &&
            'type' in entity
            ? entity.type
            : '',
        )

        return {
          ...setConfig,
          attributes,
        }
      })
      .filter((set) => set.attributes.length > 0)
  }, [surveyFocus, entity])
}
