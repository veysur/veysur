import fs from 'fs'
import type { AddressInfo } from 'net'
import { ModelManager } from '@datacapy/om'
import { Server } from '@datacapy/server'

import { initMultipart } from './03-multipart'

// formidable needs real timers; the global fake timers stall its parser
jest.useRealTimers()

describe.each(['express', 'hono'] as const)(
  'initMultipart over HTTP on the %s adaptor',
  (adaptor) => {
    let server: Server
    let base: string
    const files: string[] = []

    beforeAll(async () => {
      server = new Server(
        { path: '/api', port: 0, adaptor },
        new ModelManager(),
      )
      server.setLogger({ error: () => undefined, info: () => undefined })
      initMultipart(server)
      server.use('router', (req, res) => {
        res.json(req.body ?? null)
      })
      await server.init()
      await server.adaptor.listen(0)
      base = `http://127.0.0.1:${(server.server?.address() as AddressInfo).port}`
    })

    afterAll(async () => {
      await server.adaptor.close()
      files.forEach((file) => fs.rmSync(file, { force: true }))
    })

    it('puts fields and the first file of each field into req.body', async () => {
      const form = new FormData()
      form.append('title', 'hello')
      form.append('tag', 'a')
      form.append('tag', 'b')
      form.append(
        'upload',
        new Blob(['file body'], { type: 'text/plain' }),
        'a.txt',
      )

      const res = await fetch(`${base}/api/x`, { method: 'POST', body: form })
      const body = (await res.json()) as Record<string, any>
      files.push(body.upload?.filepath)

      expect(body.title).toBe('hello')
      expect(body.tag).toEqual(['a', 'b'])
      expect(body.upload).toMatchObject({
        filename: 'a.txt',
        mimeType: 'text/plain',
        size: 9,
      })
      expect(fs.readFileSync(body.upload.filepath, 'utf8')).toBe('file body')
    })

    it('leaves a non-multipart request untouched', async () => {
      const res = await fetch(`${base}/api/x`, {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: 'plain',
      })

      expect(res.status).toBe(200)
    })
  },
)
