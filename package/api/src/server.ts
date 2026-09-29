import * as Sentry from '@sentry/node'
import Server from '@datacapy/server'
import { Logger } from 'veysur-common'

import configDefault from './config/default'
import { composed, modelManager } from './model-manager'

export const server = new Server(configDefault, modelManager)
server.setLogger(new Logger())
server.addApiConfigs(composed.endpoints)
server.addRoleAssessors(composed.roleAssessors)
server.addInitialisers(composed.serverInit['00-init'], '00-init')
server.addInitialisers(
  composed.serverInit['01-model-initialised'],
  '01-model-initialised',
)
server.addInitialisers(
  composed.serverInit['04-router-mounted'],
  '04-router-mounted',
)
server.addInitialisers(composed.serverInit['99-final'], '99-final')

process.on('unhandledRejection', (reason) => {
  server.logger.error(reason)
  if (reason instanceof Error) {
    Sentry.captureException(reason)
  }
})

export default server
