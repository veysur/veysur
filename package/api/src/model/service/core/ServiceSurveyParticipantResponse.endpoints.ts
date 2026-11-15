// Generated from ServiceSurveyParticipantResponse.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const surveyParticipantResponseConfig = {
  service: 'surveyParticipantResponse',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    get: {
      method: 'get',
      verbs: ['get'],
      path: '/:surveyId',
      data: { surveyId: { src: 'param', required: false, type: String } },
      acl: { rules: [{ allow: true, role: 'participant' }] },
    },
    save: {
      method: 'save',
      verbs: ['post'],
      path: '/:surveyId',
      data: {
        surveyId: { src: 'param', required: false, type: String },
        response: { src: 'body', required: true },
        ip: { src: 'request', required: false, type: String },
        referrerUrl: {
          src: 'header',
          srcPath: 'Referer',
          required: false,
          type: String,
        },
      },
      acl: { rules: [{ allow: true, role: 'participant' }] },
      response: { error: { PlanLimitExceededError: { http: { code: 402 } } } },
    },
  },
} satisfies ServerApiConfig

export default surveyParticipantResponseConfig
