import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { scanHtmlAssets } from './10-html'

describe('scanHtmlAssets', () => {
  let dir: string

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-assets-'))
    fs.mkdirSync(path.join(dir, 'email'))
    fs.writeFileSync(path.join(dir, 'email', 'foo.html'), '<a>{{url}}</a>')
    fs.writeFileSync(path.join(dir, 'email', 'foo-text.html'), 'Open {{url}}')
  })

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('escapes values in html templates but not in -text templates', async () => {
    const config: Record<string, unknown> = {}
    await scanHtmlAssets(dir, config)
    const email = config.email as Record<
      string,
      (data: Record<string, string>) => string
    >
    const data = { url: "https://x.test/v?email=a@b.c&token=1&n=O'Brien" }

    expect(email['foo-text'](data)).toBe(`Open ${data.url}`)
    expect(email['foo'](data)).toContain('&amp;token&#x3D;1')
  })
})
