// cspell:ignore jdoc
import { DataSourceMysql } from '@datacapy/server'
import { SchemaEncryptionServiceRsa } from '@datacapy/om'
import { generateKeyPairSync } from 'crypto'

import MoveProjectKeysToSettingProject from './2026-10-18_1100_move-project-keys-to-setting-project'

/**
 * MySQL integration test for moving the project keys to `settingProject`. Seeds
 * disposable databases with plaintext and already-encrypted values, runs the
 * migration and asserts the keys moved, every secret is an envelope that still
 * decrypts to the original, `settingSurvey` lost the keys, and a second run
 * changes nothing.
 *
 * Runs only under `pnpm test:integration` (needs Docker MySQL).
 */
interface Keys {
  siteKey?: string | null
  secretKey: string | null
}
interface ProjectDoc {
  maps?: { googleApiKey?: string }
  botProtection?: { provider?: string; cloudflare: Keys; google: Keys }
}

describe('MoveProjectKeysToSettingProject (MySQL integration)', () => {
  let dataSource: DataSourceMysql
  let service: SchemaEncryptionServiceRsa

  const exec = (sql: string, values?: unknown[]) =>
    dataSource.execute(sql, values)
  const insertSurvey = (jdoc: unknown) =>
    exec('INSERT INTO `settingSurvey` (`jdoc`) VALUES (?)', [
      JSON.stringify(jdoc),
    ])
  const docs = async (table: string) => {
    const [rows] = (await exec(`SELECT \`jdoc\` FROM \`${table}\``)) as [
      Array<{ jdoc: ProjectDoc & { _id: string } }>,
    ]
    return rows.map((row) => row.jdoc)
  }

  const modelManager = (encryptionService: unknown = service) => ({
    config: { encryptionService },
    getRepo: () => ({
      getDataSource: async () => dataSource,
      releaseDataSource: () => undefined,
    }),
  })
  const run = (encryptionService?: unknown) =>
    new MoveProjectKeysToSettingProject().update(
      modelManager(encryptionService) as never,
      undefined as never,
    )
  // A fresh data source per reset: dropping a table behind its back leaves the
  // data source's table-exists cache stale
  const reset = async () => {
    await dataSource?.close()
    dataSource = new DataSourceMysql({
      host: process.env.MYSQL_HOST || 'localhost',
      port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE_TEST || 'veysurMoveProjectKeysTest',
      ensureDatabase: true,
    })
    await dataSource.connect()
    await exec('DROP TABLE IF EXISTS `settingSurvey`')
    await exec('DROP TABLE IF EXISTS `settingProject`')
    await dataSource.createTable('settingSurvey')
  }

  beforeAll(() => {
    jest.useRealTimers()
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    })
    service = new SchemaEncryptionServiceRsa({ publicKey, privateKey })
  })

  afterAll(async () => {
    await dataSource?.close()
  })

  describe('a settingSurvey with plaintext keys', () => {
    beforeAll(async () => {
      await reset()
      await insertSurvey({
        _id: 'SET1',
        presentation: { noBrand: true },
        maps: { googleApiKey: 'maps-key' },
        botProtection: {
          provider: 'cloudflare',
          cloudflare: { siteKey: 'site', secretKey: 'cf-plain' },
          google: { siteKey: 'g-site', secretKey: 'g-plain' },
        },
      })
      await run()
    })

    it('copies maps and encrypts the secrets into settingProject', async () => {
      const [doc] = await docs('settingProject')
      const { cloudflare, google } = doc.botProtection
      expect(doc.maps.googleApiKey).toBe('maps-key')
      expect(cloudflare.secretKey).not.toBe('cf-plain')
      expect(await service.decrypt(cloudflare.secretKey)).toBe('cf-plain')
      expect(await service.decrypt(google.secretKey)).toBe('g-plain')
      expect(cloudflare.siteKey).toBe('site')
      expect(doc.botProtection.provider).toBe('cloudflare')
    })

    it('removes both keys from settingSurvey and keeps the rest', async () => {
      const [doc] = await docs('settingSurvey')
      expect(doc).not.toHaveProperty('maps')
      expect(doc).not.toHaveProperty('botProtection')
      expect(doc).toMatchObject({ presentation: { noBrand: true } })
    })

    it('is idempotent on a second run', async () => {
      const before = await docs('settingProject')
      await run()
      expect(await docs('settingProject')).toEqual(before)
      expect(await docs('settingProject')).toHaveLength(1)
    })
  })

  describe('other documents', () => {
    beforeEach(reset)

    it('leaves a settingSurvey without the keys alone and creates no settingProject', async () => {
      await insertSurvey({ _id: 'SET2', presentation: { noBrand: false } })

      await run()

      expect(await docs('settingSurvey')).toHaveLength(1)
      const [rows] = (await exec(
        `SELECT COUNT(*) AS count FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'settingProject'`,
      )) as [Array<{ count: number }>]
      expect(rows[0].count).toBe(0)
    })

    it('keeps empty and null secrets and already encrypted values', async () => {
      await insertSurvey({
        _id: 'SET3',
        botProtection: {
          cloudflare: { siteKey: null, secretKey: null },
          google: { siteKey: '', secretKey: await service.encrypt('already') },
        },
      })

      await run()

      const [doc] = await docs('settingProject')
      expect(doc.botProtection.cloudflare.secretKey).toBeNull()
      expect(await service.decrypt(doc.botProtection.google.secretKey)).toBe(
        'already',
      )
    })

    it('keeps an existing settingProject and still clears settingSurvey', async () => {
      await insertSurvey({
        _id: 'SET4',
        maps: { googleApiKey: 'old-key' },
      })
      await dataSource.createTable('settingProject')
      await exec('INSERT INTO `settingProject` (`jdoc`) VALUES (?)', [
        JSON.stringify({ _id: 'KEEP', maps: { googleApiKey: 'new-key' } }),
      ])

      await run()

      const rows = await docs('settingProject')
      expect(rows).toHaveLength(1)
      expect(rows[0].maps.googleApiKey).toBe('new-key')
      expect(await docs('settingSurvey')).not.toHaveProperty('0.maps')
    })

    it('moves plaintext secrets as they are when no encryption key is configured', async () => {
      await insertSurvey({
        _id: 'SET5',
        botProtection: {
          cloudflare: { siteKey: 's', secretKey: 'cf-plain' },
          google: { siteKey: '', secretKey: '' },
        },
      })
      const warn = jest.spyOn(console, 'warn').mockImplementation()

      await run(null)

      const [doc] = await docs('settingProject')
      expect(doc.botProtection.cloudflare.secretKey).toBe('cf-plain')
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('plaintext'))
      warn.mockRestore()
    })
  })
})
