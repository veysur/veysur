import './sentry'
import { server } from './server'
import { modelManager } from './model-manager'

const env: NodeJS.ProcessEnv = process && process.env ? process.env : {}

const { API_TASK, API_ACTION, API_TASK_JSON } = env

const mode = API_TASK ? 'task' : 'server'
const taskAction = API_ACTION ? API_ACTION : 'run'

;(async () => {
  try {
    if (mode == 'server') {
      await server.init()
      await server.start()
    } else {
      await modelManager.init()

      const config = modelManager.config

      let options = {}
      if (API_TASK_JSON) {
        options = JSON.parse(API_TASK_JSON)
      }

      console.log(`[Task] Running ${API_TASK}.${taskAction}`)
      const result = await modelManager.services[API_TASK][taskAction](
        options,
        config,
      )
      console.log(
        `[Task] Completed ${API_TASK}.${taskAction}` +
          (result !== undefined ? `: ${JSON.stringify(result)}` : ''),
      )
      await modelManager.shutdown()
    }
  } catch (error) {
    console.error('STARTUP ERROR:', error)
    server.logger.error(error)
    await server.shutdown()
  }
})()
