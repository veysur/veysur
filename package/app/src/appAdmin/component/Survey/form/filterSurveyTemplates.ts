import { SurveyTemplateSummary } from '../model/api/SurveyApi'

export const SURVEY_TEMPLATE_CATEGORY_ALL = 'all'

export const surveyTemplateCategories = (
  templates: SurveyTemplateSummary[],
): string[] =>
  [...new Set(templates.map((template) => template.category))].sort((a, b) =>
    a.localeCompare(b),
  )

export const filterSurveyTemplates = (
  templates: SurveyTemplateSummary[],
  search: string,
  category: string,
): SurveyTemplateSummary[] => {
  const term = search.trim().toLowerCase()
  return templates.filter((template) => {
    if (
      category !== SURVEY_TEMPLATE_CATEGORY_ALL &&
      template.category !== category
    ) {
      return false
    }
    return (
      !term ||
      [template.name, template.description, template.category].some((text) =>
        text.toLowerCase().includes(term),
      )
    )
  })
}
