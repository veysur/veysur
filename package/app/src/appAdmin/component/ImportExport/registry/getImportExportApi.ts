import { Registry } from 'common'
import { KEY_REGISTRY_API_IMPORT_EXPORT } from 'appAdmin/common'
import { getRestClient } from 'registry'

import { ImportExportApi } from '../model'

export function createImportExportApi() {
  return new ImportExportApi(getRestClient())
}

export const getImportExportApi = (): ImportExportApi => {
  return Registry.getInstance().get(
    KEY_REGISTRY_API_IMPORT_EXPORT,
    createImportExportApi,
  )
}
