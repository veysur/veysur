import { ServerApiConfig } from 'mzen-server'

export const authEmailPasswordConfig: ServerApiConfig = {
  service: 'authEmailPassword',
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    postEmailPassword: {
      path: '/login',
      method: 'login',
      verbs: ['post'],
      data: {
        email: { src: 'body', required: true },
        password: { src: 'body', required: true },
        ip: { src: 'request', required: false },
        clientId: { srcPath: 'Client-Id', src: 'header', required: false },
        userAgent: { srcPath: 'User-Agent', src: 'header', required: false },
        deviceName: { srcPath: 'Device-Name', src: 'header', required: false },
        deviceSystem: {
          srcPath: 'Device-System',
          src: 'header',
          required: false,
        },
        deviceSystemVersion: {
          srcPath: 'Device-System-Version',
          src: 'header',
          required: false,
        },
        buildVersion: {
          srcPath: 'Build-Version',
          src: 'header',
          required: false,
        },
        buildNumber: {
          srcPath: 'Build-Number',
          src: 'header',
          required: false,
        },
        notificationToken: {
          srcPath: 'Notification-Token',
          src: 'header',
          required: false,
        },
        jwtConfig: {
          src: 'config',
          srcPath: 'model.app.jwt',
          required: true,
        },
      },
      acl: {
        rules: [{ allow: true, role: 'all' }],
      },
    },
  },
}

export default authEmailPasswordConfig
