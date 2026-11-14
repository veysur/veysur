// Generated from ServiceSurveyParticipantAttributeSnapshot.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const surveyParticipantAttributeSnapshotConfig = {
  service: 'surveyParticipantAttributeSnapshot',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    getSurveyParticipantAttributeSnapshot: {
      method: 'get',
      verbs: ['get'],
      path: '/:surveyId',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        lang: { src: 'query', required: false, type: String },
      },
      acl: { rules: [{ allow: true, role: 'all' }] },
    },
  },
} satisfies ServerApiConfig

export default surveyParticipantAttributeSnapshotConfig
