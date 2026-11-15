// Generated from ServiceUser.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const userConfig = {
  service: 'user',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    me: {
      method: 'me',
      verbs: ['get'],
      path: '/me',
      data: {},
      acl: { rules: [{ allow: true, role: 'authedAdmin' }] },
    },
    putProfile: {
      method: 'putProfile',
      verbs: ['put'],
      path: '/profile',
      data: { data: { src: 'body', required: true } },
      acl: { rules: [{ allow: true, role: 'authedAdmin' }] },
    },
    validatePasswordCurrent: {
      method: 'validatePasswordCurrent',
      verbs: ['post'],
      path: '/validate-password-current',
      data: { value: { src: 'body', required: true, type: String } },
      acl: { rules: [{ allow: true, role: 'authedAdmin' }] },
    },
    validateEmailNotRegistered: {
      method: 'validateEmailNotRegistered',
      verbs: ['post'],
      path: '/validate-email-not-registered',
      data: { value: { src: 'body', required: true, type: String } },
      acl: { rules: [{ allow: true, role: 'all' }] },
    },
  },
} satisfies ServerApiConfig

export default userConfig
