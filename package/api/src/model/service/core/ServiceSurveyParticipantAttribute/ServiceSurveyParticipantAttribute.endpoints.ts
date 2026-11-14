// Generated from ServiceSurveyParticipantAttribute.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const surveyParticipantAttributeConfig = {
  service: 'surveyParticipantAttribute',
  path: '/survey-participant-attribute',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    getAllSurveyParticipantAttribute: {
      method: 'list',
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
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    postSurveyParticipantAttribute: {
      method: 'create',
      verbs: ['post'],
      path: '/:surveyId',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        attribute: { src: 'body', required: true },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    deleteSurveyParticipantAttribute: {
      method: 'delete',
      verbs: ['delete'],
      path: '/:surveyId/:attributeName',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        attributeName: { src: 'param', required: true, type: String },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    batchSaveSurveyParticipantAttribute: {
      method: 'batchSave',
      verbs: ['patch'],
      path: '/:surveyId',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        changes: { src: 'body', required: true, type: Array },
        orderedAttributeNames: { src: 'body', required: false, type: Array },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
  },
} satisfies ServerApiConfig

export default surveyParticipantAttributeConfig
