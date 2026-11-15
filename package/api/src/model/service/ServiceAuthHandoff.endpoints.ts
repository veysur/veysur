// Generated from ServiceAuthHandoff.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const authHandoffConfig = {
  service: 'authHandoff',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    create: {
      method: 'create',
      verbs: ['post'],
      path: '/',
      data: {
        rememberMe: { src: 'body', required: false, type: Boolean },
        ip: { src: 'request', required: true, type: String },
        jwtConfig: { src: 'config', srcPath: 'model.app.jwt', required: true },
      },
      acl: { rules: [{ allow: true, role: 'authedAdmin' }] },
    },
    redeem: {
      method: 'redeem',
      verbs: ['post'],
      path: '/redeem',
      data: { token: { src: 'body', required: true, type: String } },
      acl: { rules: [{ allow: true, role: 'all' }] },
    },
  },
} satisfies ServerApiConfig

export default authHandoffConfig
