import { Registry } from 'common'
import { FileApi } from 'appAdmin/api/FileApi'
import { getRestClient } from 'registry/getRestClient'

const KEY_FILE_API = 'file-api'

export function createFileApi() {
  return new FileApi(getRestClient())
}

export function getFileApi(): FileApi {
  return Registry.getInstance().get(KEY_FILE_API, createFileApi)
}

export default getFileApi
