import { Api, ErrorRest } from 'model'

export type TwoFactorSetupData = {
  secret: string
  otpauthUri: string
}

export class UserTwoFactorApi extends Api {
  async getSetupData(): Promise<TwoFactorSetupData> {
    try {
      return await this.getClient().post<TwoFactorSetupData>(
        'two-factor/setup',
        {},
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async enable(code: string, secret: string): Promise<void> {
    try {
      await this.getClient().post('two-factor/enable', { code, secret })
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async disable(password: string): Promise<void> {
    try {
      await this.getClient().post('two-factor/disable', { password })
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async dismissPrompt(): Promise<void> {
    try {
      await this.getClient().post('two-factor/dismiss-prompt', {})
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }
}
