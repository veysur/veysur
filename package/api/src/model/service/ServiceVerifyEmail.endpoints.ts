// Generated from ServiceVerifyEmail.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const verifyEmailConfig = {
  service: 'verifyEmail',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    getSend: {
      method: 'send',
      verbs: ['get'],
      path: '/send',
      data: {},
      acl: { rules: [{ allow: true, role: 'authedAdmin' }] },
    },
    postVerify: {
      method: 'verify',
      verbs: ['post'],
      path: '/verify',
      data: {
        email: { src: 'body', required: true, type: String },
        token: { src: 'body', required: true, type: String },
      },
      acl: { rules: [{ allow: true, role: 'all' }] },
    },
  },
} satisfies ServerApiConfig

export default verifyEmailConfig
