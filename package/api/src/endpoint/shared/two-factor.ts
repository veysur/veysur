import { ServerApiConfig } from '@datacapy/server'

const aclAuthedAdmin = { rules: [{ allow: true, role: 'authedAdmin' }] }
const aclPreAuth = { rules: [{ allow: true, role: 'preAuth' }] }
const aclAuthedAdminOrPreAuth = {
  rules: [
    { allow: true, role: 'authedAdmin' },
    { allow: true, role: 'preAuth' },
  ],
}

export const twoFactorConfig: ServerApiConfig = {
  service: 'twoFactor',
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    postSetup: {
      path: '/setup',
      method: 'generateSetupData',
      verbs: ['post'],
      data: {},
      acl: aclAuthedAdminOrPreAuth,
    },
    postEnable: {
      path: '/enable',
      method: 'verifyAndEnable',
      verbs: ['post'],
      data: {
        code: { src: 'body', required: true },
        secret: { src: 'body', required: true },
      },
      acl: aclAuthedAdmin,
    },
    postEnableAndLogin: {
      path: '/enable-and-login',
      method: 'enableAndLogin',
      verbs: ['post'],
      data: {
        code: { src: 'body', required: true },
        secret: { src: 'body', required: true },
        jwtConfig: { src: 'config', srcPath: 'model.app.jwt', required: true },
      },
      acl: aclPreAuth,
    },
    postVerifyLogin: {
      path: '/verify-login',
      method: 'verifyLogin',
      verbs: ['post'],
      data: {
        code: { src: 'body', required: true },
        jwtConfig: { src: 'config', srcPath: 'model.app.jwt', required: true },
      },
      acl: aclPreAuth,
    },
    postDisable: {
      path: '/disable',
      method: 'disable',
      verbs: ['post'],
      data: {
        password: { src: 'body', required: true },
      },
      acl: aclAuthedAdmin,
    },
    postDismissPrompt: {
      path: '/dismiss-prompt',
      method: 'dismissPrompt',
      verbs: ['post'],
      data: {},
      acl: aclAuthedAdmin,
    },
  },
}

export default twoFactorConfig
