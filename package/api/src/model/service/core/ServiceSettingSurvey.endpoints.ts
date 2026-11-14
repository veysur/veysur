// Generated from ServiceSettingSurvey.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const settingSurveyConfig = {
  service: 'settingSurvey',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    getSettingSurvey: {
      method: 'getOne',
      verbs: ['get'],
      path: '/',
      data: {
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    patchSettingSurvey: {
      method: 'patch',
      verbs: ['patch'],
      path: '/',
      data: {
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        patches: { src: 'body', required: true, type: Array },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
      response: { error: { PlanLimitExceededError: { http: { code: 402 } } } },
    },
  },
} satisfies ServerApiConfig

export default settingSurveyConfig
