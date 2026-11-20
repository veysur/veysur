// cspell:ignore priv
import fs from 'fs'
import os from 'os'
import path from 'path'
import type { AddressInfo } from 'net'
import { ModelManager } from '@datacapy/om'
import { Server } from '@datacapy/server'

import { signUploadToken } from 'common'
import { initStorage } from './05-storage'

const STORAGE_DIR = path.join(os.tmpdir(), 'veysur-storage-init-test')
const UPLOAD_SECRET = 'upload-secret-for-tests-0123456789'

jest.mock('config/default', () => {
  const actual = jest.requireActual('config/default')
  return {
    ...actual,
    app: {
      ...actual.app,
      s3: {
        ...actual.app.s3,
        type: 'local',
        publicBucket: 'pub',
        privateBucket: 'priv',
        uploadSecret: 'upload-secret-for-tests-0123456789',
        localPath: jest
          .requireActual<typeof import('path')>('path')
          .join(
            jest.requireActual<typeof import('os')>('os').tmpdir(),
            'veysur-storage-init-test',
          ),
        publicBaseUrl: 'http://localhost',
        maxUploadSize: 1024 * 1024,
      },
    },
  }
})

// Local file serving uses real streams and token expiry uses the real clock
jest.useRealTimers()

describe('initStorage over HTTP', () => {
  let server: Server
  let base: string

  beforeAll(async () => {
    fs.rmSync(STORAGE_DIR, { recursive: true, force: true })
    fs.mkdirSync(STORAGE_DIR, { recursive: true })
    server = new Server({ path: '/api', port: 0 }, new ModelManager())
    server.setLogger({ error: () => undefined, info: () => undefined })
    initStorage(server)
    await server.init()
    await server.adaptor.listen(0)
    base = `http://127.0.0.1:${(server.server?.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await server.adaptor.close()
    fs.rmSync(STORAGE_DIR, { recursive: true, force: true })
  })

  const upload = (
    bucket: string,
    key: string,
    token: string | undefined,
    body: string | Uint8Array,
    headers: Record<string, string> = {},
  ) =>
    fetch(
      `${base}/api/file/upload/${bucket}/${key}${token ? `?token=${token}` : ''}`,
      { method: 'PUT', headers, body },
    )

  it('stores an upload with a valid token and serves it from a public bucket', async () => {
    const token = signUploadToken(UPLOAD_SECRET, 'pub', 'a/b/hello.txt')

    const put = await upload('pub', 'a/b/hello.txt', token, 'hello world', {
      'content-type': 'text/plain',
    })
    const get = await fetch(`${base}/storage/pub/a/b/hello.txt`)

    expect(put.status).toBe(200)
    expect(await put.json()).toEqual({ success: true })
    expect(get.status).toBe(200)
    expect(get.headers.get('content-type')).toBe('text/plain')
    expect(await get.text()).toBe('hello world')
  })

  it('keeps the exact bytes of a binary upload', async () => {
    const bytes = new Uint8Array([0, 1, 2, 253, 254, 255])
    const token = signUploadToken(UPLOAD_SECRET, 'pub', 'bin.dat')

    await upload('pub', 'bin.dat', token, bytes, {
      'content-type': 'application/octet-stream',
    })
    const get = await fetch(`${base}/storage/pub/bin.dat`)

    expect(new Uint8Array(await get.arrayBuffer())).toEqual(bytes)
  })

  it('refuses an upload with no token', async () => {
    const res = await upload('pub', 'x.txt', undefined, 'x')

    expect(res.status).toBe(401)
  })

  it('refuses an invalid token, and a token for another target', async () => {
    const bad = await upload('pub', 'x.txt', 'not-a-token', 'x')
    const other = await upload(
      'pub',
      'x.txt',
      signUploadToken(UPLOAD_SECRET, 'pub', 'y.txt'),
      'x',
    )

    expect(bad.status).toBe(403)
    expect(other.status).toBe(403)
    expect(fs.existsSync(path.join(STORAGE_DIR, 'pub', 'x.txt'))).toBe(false)
  })

  it('serves a private file only with a token for it', async () => {
    const token = signUploadToken(UPLOAD_SECRET, 'priv', 'doc.txt')
    await upload('priv', 'doc.txt', token, 'private body', {
      'content-type': 'text/plain',
    })

    const without = await fetch(`${base}/storage/priv/doc.txt`)
    const withToken = await fetch(`${base}/storage/priv/doc.txt?token=${token}`)

    expect(without.status).toBe(403)
    expect(await withToken.text()).toBe('private body')
  })

  it('answers 404 for a file that was never stored', async () => {
    const res = await fetch(`${base}/storage/pub/none.txt`)

    expect(res.status).toBe(404)
  })
})
