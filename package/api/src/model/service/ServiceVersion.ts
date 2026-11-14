import { Service } from '@datacapy/server'

/** @endpoints version */
export class ServiceVersion extends Service {
  constructor() {
    super({
      name: 'version',
    })
  }

  /**
   * @route get /
   * @endpoint getGet
   * @acl public
   */
  async get() {
    return { version: process.env.BUILD_VERSION ?? 'dev' }
  }
}

export default ServiceVersion
