export type { IpLocation } from './IpLocation'
export type { IpLookupProvider } from './IpLookupProvider'
export { isPublicIp } from './IpLookupProvider'
export { IpLookupService } from './IpLookupService'
export { truncateIp } from './ipUtils'
export { IpApiProvider } from './provider/IpApiProvider'

import { IpLookupService } from './IpLookupService'
import { IpApiProvider } from './provider/IpApiProvider'
import type { IpLookupProvider } from './IpLookupProvider'

let ipLookupService = new IpLookupService(new IpApiProvider())

export const setIpLookupProvider = (provider: IpLookupProvider) => {
  ipLookupService = new IpLookupService(provider)
}

export const lookupIp = (ip: string) => ipLookupService.lookupIp(ip)
