import { initProjectDefault } from './00-project-default'
import { initLogger } from './01-logger'
import { initMultipart } from './03-multipart'
import { initStorage } from './05-storage'
import { initRateLimit } from './07-rate-limit'
import { initI18nErrorTranslator } from './08-i18n-error-translator'

export const init = [
  initProjectDefault,
  initLogger,
  initRateLimit,
  initMultipart,
  initStorage,
  initI18nErrorTranslator,
]

export default init
