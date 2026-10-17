import { ServerApiConfig } from '@datacapy/server'

export const authParticipantConfig: ServerApiConfig = {
  service: 'authParticipant',
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    post: {
      path: '/:surveyId',
      method: 'auth',
      verbs: ['post'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        token: { src: 'body' },
        emailVerifyToken: { src: 'body' },
        embedOrigin: { src: 'header', srcPath: 'X-Embed-Origin' },
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
    botVerify: {
      path: '/:surveyId/bot-verify',
      method: 'botVerify',
      verbs: ['post'],
      data: {
        surveyId: { src: 'param', required: true },
        token: { src: 'body', required: true },
        honeypot: { src: 'body' },
        ip: { src: 'request', required: false },
        jwtConfig: {
          src: 'config',
          srcPath: 'model.app.jwt',
          required: true,
        },
      },
      acl: {
        rules: [{ allow: true, role: 'participant' }],
      },
    },
    botChallenge: {
      path: '/:surveyId/bot-challenge',
      method: 'botChallenge',
      verbs: ['post'],
      data: {
        surveyId: { src: 'param', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'participant' }],
      },
    },
    register: {
      path: '/:surveyId/register',
      method: 'register',
      verbs: ['post'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        nameFirst: { src: 'body', required: true },
        nameLast: { src: 'body', required: true },
        email: { src: 'body', required: true },
        language: { src: 'body' },
        attributes: { src: 'body' },
        ip: { src: 'request', required: false },
      },
      acl: {
        rules: [{ allow: true, role: 'all' }],
      },
    },
  },
}

export default authParticipantConfig
