// Generated from ServiceProjectAdmin.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const projectAdminConfig = {
  service: 'projectAdmin',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    getInviteDetail: {
      method: 'getInviteDetail',
      verbs: ['get'],
      path: '/accept-detail',
      data: {
        code: { src: 'query', required: false, type: String },
        email: { src: 'query', required: false, type: String },
      },
      acl: { rules: [{ allow: true, role: 'all' }] },
    },
    postAccept: {
      method: 'accept',
      verbs: ['post'],
      path: '/accept',
      data: {
        code: { src: 'body', required: false, type: String },
        email: { src: 'body', required: false, type: String },
      },
      acl: { rules: [{ allow: true, role: 'authedAdmin' }] },
    },
    postAcceptNewAccount: {
      method: 'acceptNewAccount',
      verbs: ['post'],
      path: '/accept-new-account',
      data: {
        code: { src: 'body', required: true, type: String },
        email: { src: 'body', required: true, type: String },
        nameFirst: { src: 'body', required: true, type: String },
        nameLast: { src: 'body', required: false, type: String },
        password: { src: 'body', required: true, type: String },
        ip: { src: 'request', required: false, type: String },
        userAgent: {
          src: 'header',
          srcPath: 'User-Agent',
          required: false,
          type: String,
        },
        deviceId: {
          src: 'header',
          srcPath: 'Device-Id',
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
        jwtConfig: { src: 'config', srcPath: 'model.app.jwt', required: true },
      },
      acl: { rules: [{ allow: true, role: 'all' }] },
    },
    postDecline: {
      method: 'decline',
      verbs: ['post'],
      path: '/decline',
      data: {
        code: { src: 'body', required: false, type: String },
        email: { src: 'body', required: false, type: String },
      },
      acl: { rules: [{ allow: true, role: 'authedAdmin' }] },
    },
    getProjectAdmins: {
      method: 'listWithUsers',
      verbs: ['get'],
      path: '/:projectId',
      data: {
        projectId: { src: 'param', required: false, type: String },
        limit: { src: 'query', required: false, type: Number },
        skip: { src: 'query', required: false, type: Number },
      },
      acl: {
        rules: [
          { allow: true, role: 'projectAdmin' },
          { allow: true, role: 'projectOwner' },
        ],
      },
    },
    postInvite: {
      method: 'invite',
      verbs: ['post'],
      path: '/:projectId/invite',
      data: {
        projectId: { src: 'param', required: false, type: String },
        nameFirst: { src: 'body', required: false, type: String },
        nameLast: { src: 'body', required: false, type: String },
        email: { src: 'body', required: false, type: String },
      },
      acl: { rules: [{ allow: true, role: 'projectOwner' }] },
      response: { error: { PlanLimitExceededError: { http: { code: 402 } } } },
    },
    deleteProjectAdmin: {
      method: 'remove',
      verbs: ['delete'],
      path: '/:projectId/:projectAdminId',
      data: {
        projectId: { src: 'param', required: false, type: String },
        projectAdminId: { src: 'param', required: false, type: String },
      },
      acl: {
        rules: [
          { allow: true, role: 'projectAdmin' },
          { allow: true, role: 'projectOwner' },
        ],
      },
    },
  },
} satisfies ServerApiConfig

export default projectAdminConfig
