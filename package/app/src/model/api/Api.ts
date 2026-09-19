import { RestClient } from 'common'

export class Api {
  private restClient: RestClient

  constructor(restClient: RestClient) {
    this.restClient = restClient
  }

  getClient() {
    return this.restClient
  }
}
