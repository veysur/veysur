// Generated from ServiceBotProtection.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const botProtectionConfig = {
  service: 'botProtection',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    accountChallenge: {
      method: 'issueAccountChallenge',
      verbs: ['post'],
      path: '/challenge',
      data: {},
      acl: { rules: [{ allow: true, role: 'all' }] },
    },
  },
} satisfies ServerApiConfig

export default botProtectionConfig
