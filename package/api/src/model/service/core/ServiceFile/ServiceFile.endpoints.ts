// Generated from ServiceFile.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const fileConfig = {
  service: 'file',
  path: '/file',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    getAllFile: {
      method: 'getAll',
      verbs: ['get'],
      path: '/',
      data: {
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        page: { src: 'query', required: false, type: Number, defaultValue: 1 },
        perPage: {
          src: 'query',
          required: false,
          type: Number,
          defaultValue: 50,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    getFile: {
      method: 'getOne',
      verbs: ['get'],
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
    getFilesBySurvey: {
      method: 'getFilesForSurvey',
      verbs: ['get'],
      path: '/survey/:surveyId',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        page: { src: 'query', required: false, type: Number, defaultValue: 1 },
        perPage: {
          src: 'query',
          required: false,
          type: Number,
          defaultValue: 50,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    getFilesByResponse: {
      method: 'getFilesForResponse',
      verbs: ['get'],
      path: '/survey/:surveyId/response/:responseId',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        responseId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        page: { src: 'query', required: false, type: Number, defaultValue: 1 },
        perPage: {
          src: 'query',
          required: false,
          type: Number,
          defaultValue: 50,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    getFileDownloadUrl: {
      method: 'generateDownloadUrl',
      verbs: ['get'],
      path: '/:fileId/download-url',
      data: {
        fileId: { src: 'param', required: true, type: String },
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
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
  },
} satisfies ServerApiConfig

export default fileConfig
