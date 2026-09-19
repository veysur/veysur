import { Service } from 'mzen-server'

export class ServiceVersion extends Service {
  constructor() {
    super({
      name: 'version',
    })
  }

  async get() {
    return { version: process.env.BUILD_VERSION ?? 'dev' }
  }
}

export default ServiceVersion
