import { Api, ErrorRest } from 'model'

export interface AuthParticipantResponse {
  jwt: string
  created: Date
  expires: Date
  reset?: boolean
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
  ): Promise<AuthParticipantResponse> {
    try {
      const data = {
        ...(token ? { token } : {}),
        ...(emailVerifyToken ? { emailVerifyToken } : {}),
      }
      return await this.getClient().post<AuthParticipantResponse>(
        `/auth-participant/${surveyId}`,
        data,
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
