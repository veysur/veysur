import fs from 'fs/promises'
import path from 'path'
import { Server } from 'mzen-server'
import { DataSourceContext } from 'mzen-om'
import i18next from 'i18next'
import { RepoSurveyParticipant } from 'model'

const LOCALE_DIR = path.join(__dirname, '../../locale')
const NAMESPACE = 'app-survey'

async function loadResources(): Promise<
  Record<string, Record<string, unknown>>
> {
  const resources: Record<string, Record<string, unknown>> = {}
  const languages = await fs.readdir(LOCALE_DIR)

  for (const lng of languages) {
    const nsPath = path.join(LOCALE_DIR, lng, `${NAMESPACE}.json`)
    try {
      const raw = await fs.readFile(nsPath, 'utf-8')
      resources[lng] = { [NAMESPACE]: JSON.parse(raw) }
    } catch {
      // no translation file for this language yet
    }
  }

  return resources
}

/**
 * Translates participant-facing error messages (thrown with a `key`) into
 * the participant's stored language before the response is serialized.
 * Reads the same translation files served to the client, so server and
 * client stay in sync without a duplicated copy.
 */
export const initI18nErrorTranslator = async function (server: Server) {
  const resources = await loadResources()
  const i18n = i18next.createInstance()
  await i18n.init({
    lng: 'en',
    fallbackLng: 'en',
    ns: [NAMESPACE],
    defaultNS: NAMESPACE,
    resources,
    interpolation: { escapeValue: false },
  })

  server.setErrorTranslator(async (err, req) => {
    if (!err?.key) {
      return err
    }

    const participantId = req.aclContext?.participantId
    const projectId = req.aclContext?.projectId
    let lng = 'en'

    if (participantId && projectId) {
      try {
        const repoSurveyParticipant = server.modelManager.repos[
          'surveyParticipant'
        ] as RepoSurveyParticipant
        const context = DataSourceContext.fromDataSources({
          project: { lookupKey: projectId },
        })
        const participant = await repoSurveyParticipant.findOne(
          { _id: participantId },
          { context },
        )
        if (participant?.language) {
          lng = participant.language
        }
      } catch {
        // fall back to English if the participant lookup fails
      }
    }

    err.userMessage = i18n.t(err.key, { ...err.params, lng, ns: NAMESPACE })
    return err
  })
}

export default initI18nErrorTranslator
