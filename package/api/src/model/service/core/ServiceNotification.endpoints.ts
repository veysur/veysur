// Generated from ServiceNotification.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const notificationConfig = {
  service: 'notification',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    list: {
      method: 'list',
      verbs: ['get'],
      path: '/list',
      data: {
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        page: { src: 'query', required: false, type: Number, defaultValue: 1 },
        perPage: {
          src: 'query',
          required: false,
          type: Number,
          defaultValue: 20,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    markRead: {
      method: 'markRead',
      verbs: ['post'],
      path: '/:notificationId/read',
      data: {
        notificationId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    dismiss: {
      method: 'dismiss',
      verbs: ['delete'],
      path: '/:notificationId',
      data: {
        notificationId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
  },
} satisfies ServerApiConfig

export default notificationConfig
