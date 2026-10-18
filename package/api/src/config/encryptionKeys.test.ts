import { parseEncryptionKeys } from './encryptionKeys'

describe('parseEncryptionKeys', () => {
  it('returns no keys when unset or blank', () => {
    expect(parseEncryptionKeys(undefined)).toEqual([])
    expect(parseEncryptionKeys('  ')).toEqual([])
  })

  it('parses a valid array', () => {
    const raw = JSON.stringify([
      {
        id: 'a',
        publicKey: 'pub',
        privateKey: 'pk',
        privateKeyPassword: 'pw',
      },
      { id: 'b', publicKey: 'pub2' },
    ])
    expect(parseEncryptionKeys(raw)).toEqual([
      {
        id: 'a',
        publicKey: 'pub',
        privateKey: 'pk',
        privateKeyPassword: 'pw',
      },
      {
        id: 'b',
        publicKey: 'pub2',
        privateKey: undefined,
        privateKeyPassword: undefined,
      },
    ])
  })

  it.each([
    ['not json', 'API_ENCRYPTION_KEYS is not valid JSON'],
    ['{}', 'non-empty JSON array'],
    ['[]', 'non-empty JSON array'],
    ['[{"id":"a"}]', 'needs a string "id" and "publicKey"'],
    [
      '[{"id":"a","publicKey":"p","privateKey":1}]',
      'privateKey must be a string',
    ],
  ])('rejects %s', (raw, message) => {
    expect(() => parseEncryptionKeys(raw)).toThrow(message)
  })
})
