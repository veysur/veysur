import { initTrustProxy } from './01-trust-proxy'
import { initApiVersionHeader } from './02-api-version-header'
import { initLocaleStatic } from './03-locale-static'

export const init = [initTrustProxy, initApiVersionHeader, initLocaleStatic]

export default init
