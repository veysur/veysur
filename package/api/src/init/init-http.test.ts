import type { AddressInfo } from 'net'
import { Server } from '@datacapy/server'
import { ModelManager } from '@datacapy/om'

import { app as appConfig } from 'config/default'
import { initCors } from './00-init/02-cors'
import { initTrustProxy } from './04-router-mounted/01-trust-proxy'
import { initApiVersionHeader } from './04-router-mounted/02-api-version-header'
import { initLocaleStatic } from './04-router-mounted/03-locale-static'

describe.each(['express', 'hono'] as const)(
  'init middleware over HTTP on the %s adaptor',
  (adaptor) => {
    let server: Server
    let base: string

    beforeAll(async () => {
      server = new Server(
        { path: '/api', port: 0, adaptor },
        new ModelManager(),
      )
      server.setLogger({ error: () => undefined, info: () => undefined })
      initCors(server)
      initApiVersionHeader(server)
      initLocaleStatic(server)
      initTrustProxy(server)
      server.use('router', (req, res) => {
        res.json({ ip: req.ip })
      })
      await server.init()
      await server.adaptor.listen(0)
      base = `http://127.0.0.1:${(server.server?.address() as AddressInfo).port}`
    })

    afterAll(async () => {
      await server.adaptor.close()
    })

    describe('CORS', () => {
      const origin = `https://${appConfig.cors.allowedDomains[0] ?? 'example.test'}`

      it('answers a preflight with 200 and the allowed methods and headers', async () => {
        const res = await fetch(`${base}/api/anything`, {
          method: 'OPTIONS',
          headers: { Origin: origin },
        })

        expect(res.status).toBe(200)
        expect(await res.text()).toBe('OK')
        expect(res.headers.get('access-control-allow-methods')).toContain(
          'PATCH',
        )
        expect(res.headers.get('access-control-allow-headers')).toContain(
          'X-Project-Id',
        )
        expect(res.headers.get('vary')).toBe('Origin')
      })

      it('echoes an allowed origin and not a foreign one', async () => {
        if (!appConfig.cors.allowedDomains[0]) return
        const allowed = await fetch(`${base}/api/x`, {
          headers: { Origin: origin },
        })
        const foreign = await fetch(`${base}/api/x`, {
          headers: { Origin: 'https://evil.example' },
        })

        expect(allowed.headers.get('access-control-allow-origin')).toBe(origin)
        expect(foreign.headers.get('access-control-allow-origin')).toBeNull()
      })
    })

    describe('locale files', () => {
      it('serves a locale file with an ETag and answers 304 on a match', async () => {
        const first = await fetch(
          `${base}/api/locale/ja/app-survey.json?v=1.2.3`,
        )
        const etag = first.headers.get('etag')

        expect(first.status).toBe(200)
        expect(first.headers.get('content-type')).toContain('application/json')
        expect(first.headers.get('cache-control')).toContain('immutable')
        expect(etag).toBeTruthy()

        const second = await fetch(`${base}/api/locale/ja/app-survey.json`, {
          headers: { 'If-None-Match': etag as string },
        })

        expect(second.status).toBe(304)
        expect(second.headers.get('cache-control')).toContain('must-revalidate')
      })

      it('passes a missing file on to later handlers', async () => {
        const res = await fetch(`${base}/api/locale/ja/missing.json`)

        expect(Object.keys(await res.json())).toEqual(['ip'])
      })
    })

    it('sets the API version header on every response', async () => {
      const res = await fetch(`${base}/api/locale/ja/app-survey.json`)

      expect(res.headers.get('x-api-version')).toBe(
        process.env.BUILD_VERSION ?? 'dev',
      )
    })

    it('trusts X-Forwarded-For from loopback, and ignores it with no proxy', async () => {
      const res = await fetch(`${base}/api/ip`, {
        headers: { 'X-Forwarded-For': '1.2.3.4' },
      })

      expect(await res.json()).toEqual({ ip: '1.2.3.4' })
    })
  },
)
