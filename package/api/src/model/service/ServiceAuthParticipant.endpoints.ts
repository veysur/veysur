// Generated from ServiceAuthParticipant.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const authParticipantConfig = {
  service: 'authParticipant',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    auth: {
      method: 'auth',
      verbs: ['post'],
      path: '/:surveyId',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        token: { src: 'body', required: false, type: String },
        emailVerifyToken: { src: 'body', required: false, type: String },
        embedOrigin: {
          src: 'header',
          srcPath: 'X-Embed-Origin',
          required: false,
          type: String,
        },
        jwtConfig: { src: 'config', srcPath: 'model.app.jwt', required: true },
      },
      acl: { rules: [{ allow: true, role: 'all' }] },
    },
    botVerify: {
      method: 'botVerify',
      verbs: ['post'],
      path: '/:surveyId/bot-verify',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        token: { src: 'body', required: true, type: String },
        honeypot: { src: 'body', required: false, type: String },
        ip: { src: 'request', required: false, type: String },
        jwtConfig: { src: 'config', srcPath: 'model.app.jwt', required: true },
      },
      acl: { rules: [{ allow: true, role: 'participant' }] },
    },
    botChallenge: {
      method: 'botChallenge',
      verbs: ['post'],
      path: '/:surveyId/bot-challenge',
      data: { surveyId: { src: 'param', required: true, type: String } },
      acl: { rules: [{ allow: true, role: 'participant' }] },
    },
    register: {
      method: 'register',
      verbs: ['post'],
      path: '/:surveyId/register',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        nameFirst: { src: 'body', required: true, type: String },
        nameLast: { src: 'body', required: true, type: String },
        email: { src: 'body', required: true, type: String },
        language: { src: 'body', required: false, type: String },
        attributes: { src: 'body', required: false },
        ip: { src: 'request', required: false, type: String },
      },
      acl: { rules: [{ allow: true, role: 'all' }] },
    },
  },
} satisfies ServerApiConfig

export default authParticipantConfig
