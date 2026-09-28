import { AuthData } from 'hook'

import { Api } from './Api'
import { ErrorRest } from './ErrorRest'

export interface AuthHandoffPayload {
  auth: AuthData
  rememberMe: boolean
}

export class ApiAuthHandoff extends Api {
  async create(
    rememberMe: boolean,
  ): Promise<{ token: string; expiresAt: string }> {
    try {
      return await this.getClient().post<{ token: string; expiresAt: string }>(
        '/auth-handoff',
        { rememberMe },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async redeem(token: string): Promise<AuthHandoffPayload> {
    try {
      return await this.getClient().post<AuthHandoffPayload>(
        '/auth-handoff/redeem',
        { token },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }
}
