/**
 * Extracts every fileUpload-question answer's referenced fileId from a
 * response's `answers` map. Detected structurally (`{fileIds: string[]}`,
 * the shape `SurveyResponseValidator.getFileUploadAnswerFileIds` also uses)
 * rather than by cross-referencing the survey's question types, so this stays
 * self-contained wherever a raw response JSON blob is available.
 */
export function collectResponseFileIds(
  answers: Record<string, unknown> | null | undefined,
): string[] {
  if (!answers || typeof answers !== 'object') return []

  const fileIds: string[] = []
  for (const value of Object.values(answers)) {
    if (!value || typeof value !== 'object') continue
    const fileIdsValue = (value as { fileIds?: unknown }).fileIds
    if (!Array.isArray(fileIdsValue)) continue
    for (const id of fileIdsValue) {
      if (typeof id === 'string') fileIds.push(id)
    }
  }
  return fileIds
}
