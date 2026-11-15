// Generated from ServiceFileDeletion.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const fileDeletionConfig = {
  service: 'fileDeletion',
  path: '/file',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    deleteImageSet: {
      method: 'deleteImageSet',
      verbs: ['delete'],
      path: '/image-set',
      data: {
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        imageSetId: { src: 'body', required: true, type: String },
        surveyId: { src: 'body', required: false, type: String },
        responseId: { src: 'body', required: false, type: String },
        fileContext: { src: 'body', required: false, type: String },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    delete: {
      method: 'delete',
      verbs: ['delete'],
      path: '/:fileId',
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
    hardDelete: {
      method: 'hardDelete',
      verbs: ['delete'],
      path: '/hard{/:olderThan}',
      data: {
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        olderThan: { src: 'param', required: false, type: String },
        fileContext: { src: 'query', required: false, type: String },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
  },
} satisfies ServerApiConfig

export default fileDeletionConfig
