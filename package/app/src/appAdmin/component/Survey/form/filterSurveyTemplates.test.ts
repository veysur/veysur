import { SurveyTemplateSummary } from '../model/api/SurveyApi'

import {
  filterSurveyTemplates,
  SURVEY_TEMPLATE_CATEGORY_ALL,
  surveyTemplateCategories,
} from './filterSurveyTemplates'

const template = (
  id: string,
  name: string,
  category: string,
  description = 'A template.',
): SurveyTemplateSummary => ({
  id,
  name,
  description,
  category,
  questionCount: 3,
})

const templates = [
  template('nps', 'Net Promoter Score', 'Customer feedback'),
  template('event', 'Event feedback', 'Events', 'Reactions to a meetup.'),
  template('csat', 'Customer satisfaction', 'Customer feedback'),
]

const all = SURVEY_TEMPLATE_CATEGORY_ALL

describe('surveyTemplateCategories', () => {
  it('returns each category once, sorted', () => {
    expect(surveyTemplateCategories(templates)).toEqual([
      'Customer feedback',
      'Events',
    ])
  })
})

describe('filterSurveyTemplates', () => {
  it('returns everything for no search and the all category', () => {
    expect(filterSurveyTemplates(templates, '  ', all)).toEqual(templates)
  })

  it('narrows by category', () => {
    expect(
      filterSurveyTemplates(templates, '', 'Events').map((t) => t.id),
    ).toEqual(['event'])
  })

  it('searches name, description and category case-insensitively', () => {
    const ids = (search: string) =>
      filterSurveyTemplates(templates, search, all).map((t) => t.id)
    expect(ids('PROMOTER')).toEqual(['nps'])
    expect(ids('meetup')).toEqual(['event'])
    expect(ids('customer')).toEqual(['nps', 'csat'])
  })

  it('combines category and search', () => {
    expect(
      filterSurveyTemplates(templates, 'satisfaction', 'Customer feedback').map(
        (t) => t.id,
      ),
    ).toEqual(['csat'])
    expect(filterSurveyTemplates(templates, 'satisfaction', 'Events')).toEqual(
      [],
    )
  })
})
