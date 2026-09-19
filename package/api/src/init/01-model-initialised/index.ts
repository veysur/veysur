import { initRateLimitRedis } from '../00-init/07-rate-limit'
import { initEventLog } from './02-event-log'
import { initProject } from './03-project'

export const init = [initRateLimitRedis, initEventLog, initProject]

export default init
