import { Registry, RestClient, KEY_REGISTRY_REST_CLIENT } from 'common'

const version = process.env.npm_package_version || '1.0.0'

interface NavigatorWithUAData extends Navigator {
  userAgentData?: {
    platform?: string
  }
}

export function createRestClient() {
  return new RestClient(
    window.location.protocol +
      '//' +
      window.location.host +
      process.env.PUBLIC_REST_API_BASE_PATH,
    {
      headers: {
        'Device-Id': '',
        'Device-Name': '',
        'Device-System':
          (navigator as NavigatorWithUAData)?.userAgentData?.platform ||
          navigator?.platform ||
          '',
        'Build-Version': version,
        'Build-Number': version,
        'Notification-Token': '',
      },
    },
  )
}

export const getRestClient = (): RestClient => {
  return Registry.getInstance().get(KEY_REGISTRY_REST_CLIENT, createRestClient)
}
