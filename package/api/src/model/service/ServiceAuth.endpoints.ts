// Generated from ServiceAuth.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const authConfig = {
  service: 'auth',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    refresh: {
      method: 'refresh',
      verbs: ['post'],
      path: '/refresh',
      data: {
        ip: { src: 'request', required: true, type: String },
        jwtConfig: { src: 'config', srcPath: 'model.app.jwt', required: true },
      },
      acl: { rules: [{ allow: true, role: 'authedAdmin' }] },
    },
    delete: {
      method: 'delete',
      verbs: ['delete'],
      path: '/',
      data: {},
      acl: { rules: [{ allow: true, role: 'authedAdmin' }] },
    },
  },
} satisfies ServerApiConfig

export default authConfig
