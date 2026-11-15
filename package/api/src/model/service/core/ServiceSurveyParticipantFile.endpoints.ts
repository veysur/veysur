// Generated from ServiceSurveyParticipantFile.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const surveyParticipantFileConfig = {
  service: 'surveyParticipantFile',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    generateUploadUrl: {
      method: 'generateUploadUrl',
      verbs: ['post'],
      path: '/upload-url',
      data: {
        filename: { src: 'body', required: true, type: String },
        fileHash: { src: 'body', required: true, type: String },
        fileSize: { src: 'body', required: true, type: Number },
        mimeType: { src: 'body', required: true, type: String },
        questionCode: { src: 'body', required: true, type: String },
        requestHost: {
          src: 'header',
          srcPath: 'X-Forwarded-Host',
          required: false,
          type: String,
        },
        requestProto: {
          src: 'header',
          srcPath: 'X-Forwarded-Proto',
          required: false,
          type: String,
        },
      },
      acl: { rules: [{ allow: true, role: 'participant' }] },
      response: { error: { PlanLimitExceededError: { http: { code: 402 } } } },
    },
    confirmUpload: {
      method: 'confirmUpload',
      verbs: ['post'],
      path: '/:fileId/confirm',
      data: { fileId: { src: 'param', required: true, type: String } },
      acl: { rules: [{ allow: true, role: 'participant' }] },
    },
  },
} satisfies ServerApiConfig

export default surveyParticipantFileConfig
