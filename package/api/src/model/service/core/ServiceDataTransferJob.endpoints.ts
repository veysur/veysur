// Generated from ServiceDataTransferJob.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const dataTransferJobConfig = {
  service: 'dataTransferJob',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    getStatus: {
      method: 'getStatus',
      verbs: ['get'],
      path: '/status/:jobId',
      data: {
        jobId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    listJobs: {
      method: 'listJobs',
      verbs: ['get'],
      path: '/list',
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
          defaultValue: 20,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    deleteJob: {
      method: 'deleteJob',
      verbs: ['delete'],
      path: '/:jobId',
      data: {
        jobId: { src: 'param', required: true, type: String },
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

export default dataTransferJobConfig
