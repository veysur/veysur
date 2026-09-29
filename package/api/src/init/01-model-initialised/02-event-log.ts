import { Server } from '@datacapy/server'

import { ServiceEventLog } from 'model/service/ServiceEventLog'

export const initEventLog = async function (server: Server) {
  const service = server.modelManager.services['eventLog'] as ServiceEventLog
  await service.start()
  server.logger.info('[EventLog] Service initialised')

  return async () => {
    server.logger.info('[EventLog] Shutting down...')
    await service.shutdown()
    server.logger.info('[EventLog] Shutdown complete')
  }
}

export default initEventLog
