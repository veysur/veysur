// Generated from ServicePassword.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const passwordConfig = {
  service: 'password',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    postResetEmail: {
      method: 'resetEmail',
      verbs: ['post'],
      path: '/reset-email',
      data: { email: { src: 'body', required: true, type: String } },
      acl: { rules: [{ allow: true, role: 'all' }] },
    },
    put: {
      method: 'put',
      verbs: ['put'],
      path: '/',
      data: {
        email: { src: 'body', required: true, type: String },
        token: { src: 'body', required: true, type: String },
        password: { src: 'body', required: true, type: String },
      },
      acl: { rules: [{ allow: true, role: 'all' }] },
    },
  },
} satisfies ServerApiConfig

export default passwordConfig
