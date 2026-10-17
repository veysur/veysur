import { loadBotProtectionProvider } from 'component/BotProtection/loadBotProtectionProvider'
import type { BotProtectionRequirement } from 'appSurvey/api/AuthParticipantApi'
import { getAuthParticipantApi } from 'appSurvey/registry'

/**
 * Passes the survey's bot check for an embed and returns the verified JWT. An
 * embed has no start step, so the provider gets a floating container that only
 * shows if it has to ask the participant to act.
 */
export async function passEmbedBotCheck(
  surveyId: string,
  jwt: string,
  requirement: BotProtectionRequirement,
): Promise<string> {
  if (requirement.provider === 'none') return jwt

  const container = document.createElement('div')
  container.style.cssText =
    'position:fixed;bottom:1rem;left:50%;transform:translateX(-50%);z-index:2147483647'
  document.body.appendChild(container)
  try {
    const api = getAuthParticipantApi()
    const provider = await loadBotProtectionProvider(requirement.provider)
    const token = await provider.solve({
      container,
      siteKey: requirement.siteKey,
      fetchChallenge: () => api.botChallenge(surveyId, jwt),
    })
    return (await api.botVerify(surveyId, jwt, token, '')).jwt
  } finally {
    container.remove()
  }
}
