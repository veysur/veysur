import { initTrustProxy } from './01-trust-proxy'
import { initApiVersionHeader } from './02-api-version-header'
import { initLocaleStatic } from './03-locale-static'
import { initRealtime } from './04-realtime'

export const init = [
  initTrustProxy,
  initApiVersionHeader,
  initLocaleStatic,
  initRealtime,
]

export default init
