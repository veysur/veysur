import { ServerApiConfig } from 'mzen-server'

export const authConfig: ServerApiConfig = {
  service: 'auth',
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    postRefresh: {
      path: '/refresh',
      method: 'refresh',
      verbs: ['post'],
      data: {
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
    delete: {
      path: '/',
      method: 'delete',
      verbs: ['delete'],
      acl: {
        rules: [{ allow: true, role: 'authedAdmin' }],
      },
    },
  },
}

export default authConfig
