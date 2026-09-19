import { QueryKey } from '@tanstack/react-query'

import {
  KEY_STATE_PUBLICATION_LIST,
  KEY_STATE_PUBLICATION_HAS_CHANGES,
} from 'appAdmin/common'

/**
 * The query keys every publish/unpublish/republish mutation must invalidate
 * - the snapshot comparison caches plus the publication list. Used as
 * `invalidateKeys` for useInvalidatingMutation.
 */
export function publicationQueryKeys(surveyId?: string): QueryKey[] {
  return [
    ['surveySnapshot', 'compare'],
    ['surveySnapshot', 'recent'],
    [KEY_STATE_PUBLICATION_LIST, surveyId],
    [KEY_STATE_PUBLICATION_HAS_CHANGES, surveyId],
  ]
}
