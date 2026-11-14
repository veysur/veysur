// Generated from ServicePing.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const pingConfig = {
  service: 'ping',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    getSend: {
      method: 'ping',
      verbs: ['get'],
      path: '/',
      data: {},
      acl: { rules: [{ allow: true, role: 'all' }] },
    },
  },
} satisfies ServerApiConfig

export default pingConfig
