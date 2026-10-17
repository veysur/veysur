import { ServerApiConfig } from '@datacapy/server'

export const botProtectionConfig: ServerApiConfig = {
  service: 'botProtection',
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    accountChallenge: {
      path: '/challenge',
      method: 'issueAccountChallenge',
      verbs: ['post'],
      acl: {
        rules: [{ allow: true, role: 'all' }],
      },
    },
  },
}

export default botProtectionConfig
