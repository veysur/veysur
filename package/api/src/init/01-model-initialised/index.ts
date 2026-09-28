import { initRateLimitRedis } from '../00-init/07-rate-limit'
import { initEventLog } from './02-event-log'
import { initProject } from './03-project'
import { initAuthHandoffRedis } from './04-auth-handoff'

export const init = [
  initRateLimitRedis,
  initEventLog,
  initProject,
  initAuthHandoffRedis,
]

export default init
