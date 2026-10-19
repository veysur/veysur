import { SchemaEncryptionService } from '@datacapy/schema'

import { SchemaL10n } from './SchemaL10n'
import { SchemaL10nHtml } from './SchemaL10nHtml'
import { SchemaL10nUrl } from './SchemaL10nUrl'
import { SchemaSettingProject } from './SchemaSettingProject'

const encryptionService: SchemaEncryptionService = {
  encrypt: async (plaintext) => `enc:${plaintext}`,
  decrypt: async (ciphertext) => ciphertext.replace(/^enc:/, ''),
  isEncrypted: (value) => value.startsWith('enc:'),
}

describe('SchemaSettingProject encrypted fields', () => {
  it('encrypts the bot-protection secret keys and nothing else', async () => {
    const schema = new SchemaSettingProject()
    schema.addSchemas([
      new SchemaL10n(),
      new SchemaL10nHtml(),
      new SchemaL10nUrl(),
    ])
    schema.config.encryptionService = encryptionService

    const doc = await schema.applyEncrypt({
      maps: { googleApiKey: 'maps-key' },
      botProtection: {
        provider: 'cloudflare',
        cloudflare: { siteKey: 'cf-site', secretKey: 'cf-secret' },
        google: { siteKey: 'g-site', secretKey: null },
      },
    })

    expect(doc.botProtection.cloudflare).toEqual({
      siteKey: 'cf-site',
      secretKey: 'enc:cf-secret',
    })
    expect(doc.botProtection.google.secretKey).toBeNull()
    expect(doc.maps.googleApiKey).toBe('maps-key')
  })

  it('does not encrypt a stored secret key that is carried forward', async () => {
    const schema = new SchemaSettingProject()
    schema.addSchemas([
      new SchemaL10n(),
      new SchemaL10nHtml(),
      new SchemaL10nUrl(),
    ])
    schema.config.encryptionService = encryptionService

    const doc = await schema.applyEncrypt({
      botProtection: {
        provider: 'cloudflare',
        cloudflare: { siteKey: 'cf-site', secretKey: 'enc:cf-secret' },
      },
    })

    expect(doc.botProtection.cloudflare.secretKey).toBe('enc:cf-secret')
  })
})
