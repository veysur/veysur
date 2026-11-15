// Generated from ServiceSurveyParticipantExport.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const surveyParticipantExportConfig = {
  service: 'surveyParticipantExport',
  path: '/survey-participant',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    export: {
      method: 'export',
      verbs: ['get'],
      path: '/:surveyId/export',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        ids: { src: 'query', required: false, type: String },
        response: { src: 'container', required: true },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
  },
} satisfies ServerApiConfig

export default surveyParticipantExportConfig
