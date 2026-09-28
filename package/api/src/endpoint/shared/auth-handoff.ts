import { ServerApiConfig } from 'mzen-server'

export const authHandoffConfig: ServerApiConfig = {
  service: 'authHandoff',
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    create: {
      path: '/',
      method: 'create',
      verbs: ['post'],
      data: {
        rememberMe: { src: 'body', required: false },
        ip: { src: 'request', required: true },
        jwtConfig: {
          src: 'config',
          srcPath: 'model.app.jwt',
          required: true,
        },
      },
      acl: {
        rules: [{ allow: true, role: 'authedAdmin' }],
      },
    },
    redeem: {
      path: '/redeem',
      method: 'redeem',
      verbs: ['post'],
      data: {
        token: { src: 'body', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'all' }],
      },
    },
  },
}

export default authHandoffConfig
