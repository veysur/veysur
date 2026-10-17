import { Api, ErrorRest } from 'model'
import type { BotChallenge } from 'component/BotProtection/BotProtectionProvider'

export interface BotProtectionRequirement {
  /** `none` when the survey has no bot check. */
  provider: 'none' | 'cloudflare' | 'google' | 'simple'
  siteKey: string
}

export interface AuthParticipantResponse {
  jwt: string
  created: Date
  expires: Date
  reset?: boolean
  botProtection?: BotProtectionRequirement
  /** False while the participant still has to pass the bot check. */
  botVerified?: boolean
}

export interface BotVerifyResponse {
  jwt: string
  created: Date
  expires: Date
}

export interface RegistrationData {
  nameFirst: string
  nameLast: string
  email: string
  language: string
  attributes: Record<string, string>
}

export class AuthParticipantApi extends Api {
  async authenticate(
    surveyId: string,
    token?: string,
    emailVerifyToken?: string,
    embedOrigin?: string,
  ): Promise<AuthParticipantResponse> {
    try {
      const data = {
        ...(token ? { token } : {}),
        ...(emailVerifyToken ? { emailVerifyToken } : {}),
      }
      return await this.getClient().post<AuthParticipantResponse>(
        `/auth-participant/${surveyId}`,
        data,
        embedOrigin
          ? { headers: { 'X-Embed-Origin': embedOrigin } }
          : undefined,
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  /** Swaps an unverified participant JWT for one that may write responses. */
  async botVerify(
    surveyId: string,
    authToken: string,
    token: string,
    honeypot: string,
  ): Promise<BotVerifyResponse> {
    try {
      return await this.getClient().post<BotVerifyResponse>(
        `/auth-participant/${surveyId}/bot-verify`,
        { token, honeypot },
        { headers: { Authorization: `Bearer ${authToken}` } },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async botChallenge(
    surveyId: string,
    authToken: string,
  ): Promise<BotChallenge> {
    try {
      return await this.getClient().post<BotChallenge>(
        `/auth-participant/${surveyId}/bot-challenge`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async register(
    surveyId: string,
    registrationData: RegistrationData,
  ): Promise<{ message: string }> {
    try {
      return await this.getClient().post<{ message: string }>(
        `/auth-participant/${surveyId}/register`,
        registrationData,
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }
}
