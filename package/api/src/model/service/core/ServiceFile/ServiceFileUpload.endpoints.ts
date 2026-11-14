// Generated from ServiceFileUpload.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const fileUploadConfig = {
  service: 'fileUpload',
  path: '/file',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    postFileUploadUrl: {
      method: 'generateUploadUrl',
      verbs: ['post'],
      path: '/upload-url',
      data: {
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
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
        filename: { src: 'body', required: true, type: String },
        fileHash: { src: 'body', required: true, type: String },
        fileSize: { src: 'body', required: true, type: Number },
        mimeType: { src: 'body', required: true, type: String },
        surveyId: { src: 'body', required: false, type: String },
        responseId: { src: 'body', required: false, type: String },
        fileContext: { src: 'body', required: false, type: String },
        imageSetId: { src: 'body', required: false, type: String },
        imageVariant: { src: 'body', required: false, type: String },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
      response: { error: { PlanLimitExceededError: { http: { code: 402 } } } },
    },
    confirmFileUpload: {
      method: 'confirmUpload',
      verbs: ['post'],
      path: '/:fileId/confirm',
      data: {
        fileId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
  },
} satisfies ServerApiConfig

export default fileUploadConfig
