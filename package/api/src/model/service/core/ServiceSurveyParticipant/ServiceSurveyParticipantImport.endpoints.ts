// Generated from ServiceSurveyParticipantImport.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const surveyParticipantImportConfig = {
  service: 'surveyParticipantImport',
  path: '/survey-participant',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    import: {
      method: 'import',
      verbs: ['post'],
      path: '/:surveyId/import',
      data: {
        file: { src: 'body', required: true, type: String },
        surveyId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        batchSize: {
          src: 'body',
          required: false,
          type: Number,
          defaultValue: 500,
        },
        response: { src: 'container', required: true },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
  },
} satisfies ServerApiConfig

export default surveyParticipantImportConfig
