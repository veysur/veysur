// Generated from ServiceSurveyStats.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const surveyStatsConfig = {
  service: 'surveyStats',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    getStats: {
      method: 'getStats',
      verbs: ['get'],
      path: '/:surveyId/:snapshotId',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        snapshotId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        publicationId: { src: 'query', required: false, type: String },
        completed: {
          src: 'query',
          required: false,
          type: String,
          defaultValue: 'all',
        },
        startDate: { src: 'query', required: false, type: String },
        endDate: { src: 'query', required: false, type: String },
        dateField: {
          src: 'query',
          required: false,
          type: String,
          defaultValue: 'createdAt',
        },
        search: { src: 'query', required: false, type: String },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
  },
} satisfies ServerApiConfig

export default surveyStatsConfig
