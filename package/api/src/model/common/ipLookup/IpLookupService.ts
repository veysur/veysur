import type { IpLocation } from './IpLocation'
import type { IpLookupProvider } from './IpLookupProvider'
import { isPublicIp } from './IpLookupProvider'

export class IpLookupService {
  constructor(private readonly provider: IpLookupProvider) {}

  async lookupIp(ip: string): Promise<IpLocation | null> {
    if (!isPublicIp(ip)) return null
    return this.provider.lookup(ip)
  }
}
