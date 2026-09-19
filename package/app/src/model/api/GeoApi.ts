import { Api } from './Api'
import { ErrorRest } from './ErrorRest'

export class GeoApi extends Api {
  async accessCheck(
    country?: string,
  ): Promise<{ country: string; blocked: boolean }> {
    try {
      return await this.getClient().get<{ country: string; blocked: boolean }>(
        'platform/geo/access-check',
        country ? { params: { country } } : undefined,
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async blockedCountries(): Promise<{ countries: string[] }> {
    try {
      return await this.getClient().get<{ countries: string[] }>(
        'platform/geo/blocked-countries',
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }
}
