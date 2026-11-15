// Generated from ServiceEventLog.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const eventLogConfig = {
  service: 'eventLog',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    log: {
      method: 'log',
      verbs: ['post'],
      path: '/',
      data: {
        projectId: {
          src: 'header',
          srcPath: 'x-project-id',
          required: false,
          type: String,
        },
        action: { src: 'body', required: true, type: String },
        userId: { src: 'body', required: false, type: String },
        metadata: { src: 'body', required: false },
      },
      acl: { rules: [{ allow: true, role: 'authedAdmin' }] },
    },
  },
} satisfies ServerApiConfig

export default eventLogConfig
