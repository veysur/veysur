// Generated from ServiceImportExport.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const importExportConfig = {
  service: 'importExport',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    exportEntity: {
      method: 'export',
      verbs: ['post'],
      path: '/export/:entityType/:entityId/:format',
      data: {
        entityType: { src: 'param', required: true, type: String },
        entityId: { src: 'param', required: true, type: String },
        format: { src: 'param', required: true, type: String },
        options: { src: 'body', required: false },
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
    generateImportUrl: {
      method: 'generateImportUrl',
      verbs: ['post'],
      path: '/import/url/:entityType',
      data: {
        entityType: { src: 'param', required: true, type: String },
        format: { src: 'body', required: true, type: String },
        options: { src: 'body', required: false },
        fileHash: { src: 'body', required: false, type: String },
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
    processImport: {
      method: 'processImport',
      verbs: ['post'],
      path: '/import/process/:fileId',
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
    getImportStatus: {
      method: 'getImportStatus',
      verbs: ['get'],
      path: '/import/status/:fileId',
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

export default importExportConfig
