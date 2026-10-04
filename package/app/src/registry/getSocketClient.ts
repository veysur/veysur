import { Registry, RealtimeClient, KEY_REGISTRY_SOCKET_CLIENT } from 'common'

export function createSocketClient() {
  return new RealtimeClient(
    window.location.origin,
    process.env.PUBLIC_REST_API_BASE_PATH + '/socket.io',
  )
}

export const getSocketClient = (): RealtimeClient => {
  return Registry.getInstance().get(
    KEY_REGISTRY_SOCKET_CLIENT,
    createSocketClient,
  )
}
