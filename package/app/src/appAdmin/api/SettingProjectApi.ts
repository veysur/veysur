import { Api } from 'model/api/Api'
import { ErrorRest } from 'model/api/ErrorRest'

export type MaskedKeys = {
  siteKey: string
  secretKey: string
  hasSecret: boolean
}

// Provider secret keys are write-only: the API blanks them and says whether one is stored
export interface SettingProjectView {
  _id: string
  maps?: { googleApiKey?: string; provider?: string }
  botProtection?: {
    provider?: string
    cloudflare?: Partial<MaskedKeys>
    google?: Partial<MaskedKeys>
  }
}

export type BotProtectionKeysInput = { siteKey: string; secretKey: string }

export type BotProtectionInput = {
  provider: string
  cloudflare: BotProtectionKeysInput
  google: BotProtectionKeysInput
}

export class SettingProjectApi extends Api {
  async get(): Promise<SettingProjectView> {
    return await this.request(() =>
      this.getClient().get<SettingProjectView>('/setting-project'),
    )
  }

  async updateMaps(googleApiKey: string): Promise<SettingProjectView> {
    return await this.request(() =>
      this.getClient().put<SettingProjectView>('/setting-project/maps', {
        maps: { googleApiKey },
      }),
    )
  }

  async updateBotProtection(
    botProtection: BotProtectionInput,
  ): Promise<SettingProjectView> {
    return await this.request(() =>
      this.getClient().put<SettingProjectView>(
        '/setting-project/bot-protection',
        { botProtection },
      ),
    )
  }

  private async request<T>(call: () => Promise<T>): Promise<T> {
    try {
      return await call()
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }
}

export default SettingProjectApi
