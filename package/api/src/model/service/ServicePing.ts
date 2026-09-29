import { Service } from '@datacapy/server'
import { DataSourceRedis } from '@datacapy/om'

export class ServicePing extends Service {
  constructor() {
    super({
      name: 'ping',
    })
  }

  async ping() {
    const health: { status: string; redis?: { connected: boolean } } = {
      status: 'ok',
    }

    // Check Redis connection if available
    const redis = this.modelManager.dataSources['cacheDb'] as DataSourceRedis
    if (redis) {
      health.redis = {
        connected: redis.connected,
      }
    }

    return health
  }
}

export default ServicePing
