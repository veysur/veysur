import { resolveContentFormat, ContentFormat } from 'veysur-common'

import { SettingsDataAdapter } from '../SettingSurveyAdapter'

// Resolves the effective content format for a generic settings data adapter
// (project SettingSurvey or survey-level override) - the same
// survey-override-falls-back-to-project-default resolution `getContentFormat`
// performs on the model, expressed against `SettingsDataAdapter`'s
// `contentFormat`/`getDefault` accessors so settings components (legal
// notice, data policy) that don't have a `Survey` instance directly can
// still ask.
export const useEffectiveContentFormat = <T>(
  data: SettingsDataAdapter<T>,
): ContentFormat => {
  const htmlAllowed =
    data.contentFormat?.htmlAllowed ??
    data.getDefault?.<boolean>('contentFormat', 'htmlAllowed') ??
    false
  const markdownAllowed =
    data.contentFormat?.markdownAllowed ??
    data.getDefault?.<boolean>('contentFormat', 'markdownAllowed') ??
    true

  return resolveContentFormat({ htmlAllowed, markdownAllowed })
}
