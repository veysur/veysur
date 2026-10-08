// Mirrors the API's embedArtefactKeys (public bucket, served under /veysur-files)
const PUBLIC_FILES_PATH = '/veysur-files'

export function parseEmbedPath(
  pathname: string,
): { projectId: string; surveyId: string } | null {
  const match = pathname.match(/^\/embed\/([^/]+)\/([^/]+)\/?$/)
  return match ? { projectId: match[1], surveyId: match[2] } : null
}

function embedDirUrl(projectId: string, surveyId: string) {
  return `${PUBLIC_FILES_PATH}/project-${projectId}/survey/${surveyId}/embed`
}

export function embedPointerUrl(projectId: string, surveyId: string) {
  return `${embedDirUrl(projectId, surveyId)}/current.json`
}

export function embedArtefactUrl(
  projectId: string,
  surveyId: string,
  snapshotId: string,
  lang: string,
) {
  return `${embedDirUrl(projectId, surveyId)}/${snapshotId}/${lang}.json`
}
