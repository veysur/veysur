// Generated from ServiceVersion.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const versionConfig = {
  service: 'version',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    getGet: {
      method: 'get',
      verbs: ['get'],
      path: '/',
      data: {},
      acl: { rules: [{ allow: true, role: 'all' }] },
    },
  },
} satisfies ServerApiConfig

export default versionConfig
