/* eslint-disable @typescript-eslint/no-require-imports -- socket.io must load after real timers */
import * as http from 'http'
import type { AddressInfo } from 'net'
import type { Server as SocketServer } from 'socket.io'
import type { Socket as ClientSocket } from 'socket.io-client'
import {
  REALTIME_EVENT_NAME,
  realtimeSurveyRoom,
  realtimeUserRoom,
} from 'veysur-common'

import { Jwt } from 'acl/util/Jwt'
import { RealtimeAuthenticator } from './RealtimeAuthenticator'
import { RealtimeGateway } from './RealtimeGateway'
import { REALTIME_SOCKET_PATH } from './constant'

const jwtConfig = { key: 'k'.repeat(64), algorithm: 'HS512' }

const buildToken = (
  overrides: Record<string, unknown> = {},
  expireSeconds = 60,
) =>
  Jwt.create(
    { _id: 'user-1', type: 'admin', ...overrides },
    jwtConfig,
    expireSeconds,
  )

describe('RealtimeGateway', () => {
  // The suite runs fake timers globally, and socket.io captures timer functions
  // when first loaded, so load it only after switching to real timers.
  let SocketServerImpl: typeof import('socket.io').Server
  let connect: typeof import('socket.io-client').io
  beforeAll(() => {
    jest.useRealTimers()
    SocketServerImpl = require('socket.io').Server
    connect = require('socket.io-client').io
  })

  let httpServer: http.Server
  let io: SocketServer
  let gateway: RealtimeGateway
  let url: string
  let validate: jest.Mock
  const clients: ClientSocket[] = []

  const open = (token: unknown): ClientSocket => {
    const client = connect(url, {
      path: REALTIME_SOCKET_PATH,
      transports: ['websocket'],
      auth: { token },
      reconnection: false,
    })
    clients.push(client)
    return client
  }

  beforeEach(async () => {
    validate = jest.fn().mockResolvedValue({ isValid: true })
    httpServer = http.createServer()
    io = new SocketServerImpl(httpServer, {
      path: REALTIME_SOCKET_PATH,
      transports: ['websocket'],
    })
    gateway = new RealtimeGateway(
      io,
      new RealtimeAuthenticator(jwtConfig, { validate }),
    )
    gateway.start()
    await new Promise<void>((resolve) => httpServer.listen(0, resolve))
    url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`
  })

  afterEach(async () => {
    clients.splice(0).forEach((client) => client.close())
    gateway.stop()
    await io.close()
  })

  it('delivers a room event to a client with a valid token', async () => {
    const client = open(await buildToken())
    await new Promise<void>((resolve) => client.on('connect', resolve))
    const received = new Promise((resolve) =>
      client.on(REALTIME_EVENT_NAME, resolve),
    )

    io.to(realtimeUserRoom('user-1')).emit(REALTIME_EVENT_NAME, {
      type: 'notification.changed',
    })

    await expect(received).resolves.toEqual({ type: 'notification.changed' })
  })

  it.each([
    ['missing', () => Promise.resolve(undefined)],
    ['tampered', async () => `${await buildToken()}x`],
    ['expired', () => buildToken({}, -10)],
    ['wrong type', () => buildToken({ type: 'participant' })],
  ])('rejects a %s token', async (_label, makeToken) => {
    const client = open(await makeToken())
    const error = await new Promise<Error>((resolve) =>
      client.on('connect_error', resolve),
    )
    expect(error.message).toBe('unauthorised')
  })

  it('rejects a token that fails jwtAdmin schema validation', async () => {
    validate.mockResolvedValue({ isValid: false })
    const client = open(await buildToken())
    const error = await new Promise<Error>((resolve) =>
      client.on('connect_error', resolve),
    )
    expect(error.message).toBe('unauthorised')
  })

  it('auth:refresh answers true for the same user and false otherwise', async () => {
    const client = open(await buildToken())
    await new Promise<void>((resolve) => client.on('connect', resolve))

    const same = await client.emitWithAck('auth:refresh', {
      token: await buildToken(),
    })
    const other = await client.emitWithAck('auth:refresh', {
      token: await buildToken({ _id: 'user-2' }),
    })
    const bad = await client.emitWithAck('auth:refresh', { token: 'nope' })

    expect(same).toEqual({ ok: true })
    expect(other).toEqual({ ok: false })
    expect(bad).toEqual({ ok: false })
  })

  it('disconnects when the token expires, and auth:refresh extends it', async () => {
    const expiring = open(await buildToken({}, 1))
    const refreshed = open(await buildToken({}, 1))
    await Promise.all(
      [expiring, refreshed].map(
        (client) =>
          new Promise<void>((resolve) => client.on('connect', resolve)),
      ),
    )
    const expired = new Promise((resolve) => expiring.on('disconnect', resolve))
    await refreshed.emitWithAck('auth:refresh', {
      token: await buildToken({}, 600),
    })

    await expired

    expect(refreshed.connected).toBe(true)
  })

  it('dispatches registered handlers by message type', async () => {
    const handler = jest.fn()
    gateway.registerHandler('custom', handler)
    const client = open(await buildToken())
    await new Promise<void>((resolve) => client.on('connect', resolve))

    client.emit('custom', { a: 1 })
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(handler).toHaveBeenCalledWith(expect.anything(), { a: 1 })
  })

  describe('survey rooms', () => {
    const join = (client: ClientSocket, projectId = 'p1') =>
      client.emitWithAck('survey:join', { projectId, surveyId: 's1' })

    const connected = async (project: Record<string, unknown>) => {
      const client = open(await buildToken({ project }))
      await new Promise<void>((resolve) => client.on('connect', resolve))
      return client
    }

    it('joins a survey room for an administered project and receives its events', async () => {
      const client = await connected({ p1: 'admin' })
      const received = new Promise((resolve) =>
        client.on(REALTIME_EVENT_NAME, resolve),
      )

      expect(await join(client)).toEqual({ ok: true })
      io.to(realtimeSurveyRoom('p1', 's1')).emit(REALTIME_EVENT_NAME, {
        type: 'survey.changed',
      })

      await expect(received).resolves.toEqual({ type: 'survey.changed' })
    })

    it('joins when the client sends no ack callback', async () => {
      const client = await connected({ p1: 'admin' })
      const received = new Promise((resolve) =>
        client.on(REALTIME_EVENT_NAME, resolve),
      )

      client.emit('survey:join', { projectId: 'p1', surveyId: 's1' })
      await new Promise((resolve) => setTimeout(resolve, 50))
      io.to(realtimeSurveyRoom('p1', 's1')).emit(REALTIME_EVENT_NAME, {
        type: 'survey.changed',
      })

      await expect(received).resolves.toEqual({ type: 'survey.changed' })
    })

    it('refuses a project the token does not administer', async () => {
      const client = await connected({ p1: 'admin' })

      expect(await join(client, 'p2')).toEqual({ ok: false })
    })

    it('refuses a malformed request', async () => {
      const client = await connected({ p1: 'admin' })

      expect(await client.emitWithAck('survey:join', { surveyId: 1 })).toEqual({
        ok: false,
      })
    })

    it('stops delivering after leaving the room', async () => {
      const client = await connected({ p1: 'admin' })
      const onEvent = jest.fn()
      client.on(REALTIME_EVENT_NAME, onEvent)
      await join(client)

      await client.emitWithAck('survey:leave', {
        projectId: 'p1',
        surveyId: 's1',
      })
      io.to(realtimeSurveyRoom('p1', 's1')).emit(REALTIME_EVENT_NAME, {})
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(onEvent).not.toHaveBeenCalled()
    })
  })
})
