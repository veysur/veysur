import type { tags as t } from '@datacapy/schema'

import type {
  SurveyElementDocument,
  SurveySectionDocument,
} from './EmbeddedSchemaData'
import type { SettingSurveyDocument } from './SettingSurveyDocument'

/**
 * The stored shape of a survey: the settings plus the survey's own fields.
 * `sections` and `elements` are plain arrays here; the constructor turns them
 * into collections, so the class type is not this type.
 *
 * @schema survey construct=Survey strict
 */
export interface SurveyDocument extends SettingSurveyDocument {
  createdById: string & t.Required
  name: string & t.Default<''> & t.Label<'Name'> & t.StripHtml & t.Trim
  title: Record<
    string,
    string & t.Label<'Title'> & t.MaxLength<255> & t.StripHtml & t.Trim
  > &
    t.Construct<'L10n'> &
    t.Default<t.EmptyObject>
  attributes: Record<string, unknown> & t.Default<t.EmptyObject>
  sectionIds: string[] & t.Default<t.EmptyArray>
  elementIds: string[] & t.Default<t.EmptyArray>
  sections?: SurveySectionDocument[]
  elements?: SurveyElementDocument[]
}
