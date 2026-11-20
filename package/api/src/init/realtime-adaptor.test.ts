import type { AddressInfo } from 'net'
import { ModelManager } from '@datacapy/om'
import { Server } from '@datacapy/server'
import { Server as SocketServer } from 'socket.io'
import type { io as connectType } from 'socket.io-client'

import { REALTIME_SOCKET_PATH } from 'realtime/constant'

// The adaptor's job for realtime: hand socket.io the Node server and close cleanly with it.
// socket.io-client captures setTimeout when first loaded, so it is imported after the
// global fake timers are switched off.
jest.useRealTimers()

describe.each(['express', 'hono'] as const)(
  'socket.io on the %s adaptor server',
  (adaptor) => {
    let server: Server
    let io: SocketServer
    let port: number
    let connect: typeof connectType

    beforeAll(async () => {
      ;({ io: connect } = await import('socket.io-client'))
    })

    beforeEach(async () => {
      server = new Server(
        { path: '/api', port: 0, adaptor },
        new ModelManager(),
      )
      server.setLogger({ error: () => undefined, info: () => undefined })
      server.use('router', (_req, res) => {
        res.json({ http: 'ok' })
      })
      io = new SocketServer(server.server, {
        path: REALTIME_SOCKET_PATH,
        transports: ['websocket'],
        serveClient: false,
      })
      io.on('connection', (socket) => {
        socket.emit('hello', 'from server')
        socket.on('ping-me', (value: string, ack: (reply: string) => void) =>
          ack(`pong ${value}`),
        )
      })
      await server.init()
      await server.adaptor.listen(0)
      port = (server.server?.address() as AddressInfo).port
    })

    afterEach(async () => {
      await io.close().catch(() => undefined)
      if (server.server?.listening) await server.adaptor.close()
    })

    const client = () =>
      connect(`http://127.0.0.1:${port}`, {
        path: REALTIME_SOCKET_PATH,
        transports: ['websocket'],
        reconnection: false,
      })

    it('serves websocket events and plain HTTP from the same server', async () => {
      const socket = client()
      const hello = await new Promise<string>((resolve) =>
        socket.on('hello', resolve),
      )
      const reply = await new Promise<string>((resolve) =>
        socket.emit('ping-me', 'x', resolve),
      )
      const http = await (
        await fetch(`http://127.0.0.1:${port}/api/anything`)
      ).json()

      expect(hello).toBe('from server')
      expect(reply).toBe('pong x')
      expect(http).toEqual({ http: 'ok' })
      socket.close()
    })

    it('closes with a connected socket and disconnects the client', async () => {
      const socket = client()
      await new Promise<void>((resolve) =>
        socket.on('connect', () => resolve()),
      )
      const disconnected = new Promise<string>((resolve) =>
        socket.on('disconnect', resolve),
      )

      const started = Date.now()
      await io.close()
      await server.adaptor.close().catch(() => undefined)

      expect(await disconnected).toBeTruthy()
      expect(Date.now() - started).toBeLessThan(3000)
      expect(server.server?.listening).toBe(false)
    })

    it('closes the adaptor while a socket is still connected, without closing socket.io first', async () => {
      const socket = client()
      await new Promise<void>((resolve) =>
        socket.on('connect', () => resolve()),
      )
      const disconnected = new Promise<string>((resolve) =>
        socket.on('disconnect', resolve),
      )

      const started = Date.now()
      await server.adaptor.close()

      expect(await disconnected).toBeTruthy()
      expect(Date.now() - started).toBeLessThan(3000)
    })
  },
)
