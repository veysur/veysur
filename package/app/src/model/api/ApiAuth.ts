import { AuthData } from 'hook'

import { Api } from './Api'
import { ErrorRest } from './ErrorRest'

export type PreAuthData =
  | { requiresTwoFactor: true; preAuthToken: string }
  | { requiresTwoFactorSetup: true; preAuthToken: string }

export type LoginResult = PreAuthData | AuthData

export class ApiAuth extends Api {
  async login(email: string, password: string): Promise<LoginResult> {
    try {
      return await this.getClient().post<LoginResult>(
        '/auth-email-password/login',
        {
          email,
          password,
        },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async getSetupDataForced(
    preAuthToken: string,
  ): Promise<{ secret: string; otpauthUri: string }> {
    try {
      return await this.getClient().post<{
        secret: string
        otpauthUri: string
      }>(
        'two-factor/setup',
        {},
        { headers: { Authorization: `Bearer ${preAuthToken}` } },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async enableAndLogin(
    preAuthToken: string,
    code: string,
    secret: string,
  ): Promise<AuthData> {
    try {
      return await this.getClient().post<AuthData>(
        'two-factor/enable-and-login',
        { code, secret },
        { headers: { Authorization: `Bearer ${preAuthToken}` } },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async verifyTwoFactor(preAuthToken: string, code: string): Promise<AuthData> {
    try {
      return await this.getClient().post<AuthData>(
        '/two-factor/verify-login',
        { code },
        {
          headers: { Authorization: `Bearer ${preAuthToken}` },
        },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async signup(data: {
    nameFirst: string
    nameLast: string
    email: string
    password: string
  }): Promise<AuthData> {
    try {
      return await this.getClient().post<AuthData>('/signup/user', data)
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async refresh(clientId: string, accessToken: string): Promise<AuthData> {
    try {
      return await this.getClient().post<AuthData>(
        '/auth/refresh',
        {},
        {
          headers: {
            'Client-Id': clientId,
            Authorization: `Bearer ${accessToken}`,
          },
        },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async delete(clientId: string, accessToken: string): Promise<void> {
    try {
      this.getClient().delete('/auth', {
        headers: {
          'Client-Id': clientId,
          Authorization: `Bearer ${accessToken}`,
        },
      })
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }
}
