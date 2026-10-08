import { generateFilePath } from 'common'

// Public-bucket layout: embed/current.json is the mutable pointer; embed/<snapshotId>/<lang>.json
// is immutable per snapshot (docs/decisions/2026/2026-10-07_embedded-surveys.md).
export function embedPointerKey(projectId: string, surveyId: string): string {
  return generateFilePath(projectId, 'embed/current.json', {
    surveyId,
    fileContext: 'survey',
  })
}

export function embedArtefactKey(
  projectId: string,
  surveyId: string,
  snapshotId: string,
  lang: string,
): string {
  return generateFilePath(projectId, `embed/${snapshotId}/${lang}.json`, {
    surveyId,
    fileContext: 'survey',
  })
}

export function embedSnapshotPrefix(
  projectId: string,
  surveyId: string,
  snapshotId: string,
): string {
  return generateFilePath(projectId, `embed/${snapshotId}/`, {
    surveyId,
    fileContext: 'survey',
  })
}

export function embedSurveyPrefix(projectId: string, surveyId: string): string {
  return generateFilePath(projectId, 'embed/', {
    surveyId,
    fileContext: 'survey',
  })
}
