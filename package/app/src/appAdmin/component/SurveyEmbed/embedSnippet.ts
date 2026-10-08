import { surveyHasFileUpload, type Survey } from 'veysur-common'

export function buildEmbedSnippet({
  origin,
  projectId,
  surveyId,
  language,
}: {
  origin: string
  projectId: string
  surveyId: string
  language?: string
}): string {
  const lang = language ? ` data-lang="${language}"` : ''
  return `<script async src="${origin}/embed/loader.js" data-survey="${projectId}/${surveyId}"${lang}></script>`
}

export function buildEmbedPreviewUrl({
  origin,
  projectId,
  surveyId,
  language,
}: {
  origin: string
  projectId: string
  surveyId: string
  language?: string
}): string {
  return `${origin}/embed/${projectId}/${surveyId}${language ? `?lang=${language}` : ''}`
}

export type EmbedBlocker = 'notOpen' | 'registration' | 'fileUpload'

export const EMBED_BLOCKER_MESSAGES: Record<EmbedBlocker, string> = {
  notOpen:
    'The survey must be Open (Settings, Access Control) so visitors can respond without an invitation.',
  registration:
    'Public Registration must be off: embedded visitors cannot register.',
  fileUpload: 'Surveys with a file upload question cannot be embedded yet.',
}

export function getEmbedBlockers(
  access: { open: boolean; publicReg: boolean },
  survey: Survey,
): EmbedBlocker[] {
  const blockers: EmbedBlocker[] = []
  if (!access.open) blockers.push('notOpen')
  if (access.publicReg) blockers.push('registration')
  if (surveyHasFileUpload(survey)) blockers.push('fileUpload')
  return blockers
}
