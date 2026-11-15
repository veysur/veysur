// Generated from ServiceAuthEmailPassword.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const authEmailPasswordConfig = {
  service: 'authEmailPassword',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    login: {
      method: 'login',
      verbs: ['post'],
      path: '/login',
      data: {
        email: { src: 'body', required: true, type: String },
        password: { src: 'body', required: true, type: String },
        botCheck: { src: 'body', required: false },
        ip: { src: 'request', required: false, type: String },
        clientId: {
          src: 'header',
          srcPath: 'Client-Id',
          required: false,
          type: String,
        },
        userAgent: {
          src: 'header',
          srcPath: 'User-Agent',
          required: false,
          type: String,
        },
        deviceName: {
          src: 'header',
          srcPath: 'Device-Name',
          required: false,
          type: String,
        },
        deviceSystem: {
          src: 'header',
          srcPath: 'Device-System',
          required: false,
          type: String,
        },
        deviceSystemVersion: {
          src: 'header',
          srcPath: 'Device-System-Version',
          required: false,
          type: String,
        },
        buildVersion: {
          src: 'header',
          srcPath: 'Build-Version',
          required: false,
          type: String,
        },
        buildNumber: {
          src: 'header',
          srcPath: 'Build-Number',
          required: false,
          type: String,
        },
        notificationToken: {
          src: 'header',
          srcPath: 'Notification-Token',
          required: false,
          type: String,
        },
        jwtConfig: { src: 'config', srcPath: 'model.app.jwt', required: true },
      },
      acl: { rules: [{ allow: true, role: 'all' }] },
    },
  },
} satisfies ServerApiConfig

export default authEmailPasswordConfig
