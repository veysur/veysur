// Generated from ServiceTwoFactor.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const twoFactorConfig = {
  service: 'twoFactor',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    generateSetupData: {
      method: 'generateSetupData',
      verbs: ['post'],
      path: '/setup',
      data: {},
      acl: {
        rules: [
          { allow: true, role: 'authedAdmin' },
          { allow: true, role: 'preAuth' },
        ],
      },
    },
    verifyAndEnable: {
      method: 'verifyAndEnable',
      verbs: ['post'],
      path: '/enable',
      data: {
        code: { src: 'body', required: true, type: String },
        secret: { src: 'body', required: true, type: String },
      },
      acl: { rules: [{ allow: true, role: 'authedAdmin' }] },
    },
    verifyLogin: {
      method: 'verifyLogin',
      verbs: ['post'],
      path: '/verify-login',
      data: {
        code: { src: 'body', required: true, type: String },
        jwtConfig: { src: 'config', srcPath: 'model.app.jwt', required: true },
      },
      acl: { rules: [{ allow: true, role: 'preAuth' }] },
    },
    enableAndLogin: {
      method: 'enableAndLogin',
      verbs: ['post'],
      path: '/enable-and-login',
      data: {
        code: { src: 'body', required: true, type: String },
        secret: { src: 'body', required: true, type: String },
        jwtConfig: { src: 'config', srcPath: 'model.app.jwt', required: true },
      },
      acl: { rules: [{ allow: true, role: 'preAuth' }] },
    },
    disable: {
      method: 'disable',
      verbs: ['post'],
      path: '/disable',
      data: { password: { src: 'body', required: true, type: String } },
      acl: { rules: [{ allow: true, role: 'authedAdmin' }] },
    },
    dismissPrompt: {
      method: 'dismissPrompt',
      verbs: ['post'],
      path: '/dismiss-prompt',
      data: {},
      acl: { rules: [{ allow: true, role: 'authedAdmin' }] },
    },
  },
} satisfies ServerApiConfig

export default twoFactorConfig
