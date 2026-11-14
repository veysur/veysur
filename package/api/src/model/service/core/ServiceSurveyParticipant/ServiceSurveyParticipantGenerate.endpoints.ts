// Generated from ServiceSurveyParticipantGenerate.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const surveyParticipantGenerateConfig = {
  service: 'surveyParticipantGenerate',
  path: '/survey-participant',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    generateSurveyParticipant: {
      method: 'generate',
      verbs: ['post'],
      path: '/:surveyId/generate',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        count: { src: 'body', required: true, type: Number },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
  },
} satisfies ServerApiConfig

export default surveyParticipantGenerateConfig
