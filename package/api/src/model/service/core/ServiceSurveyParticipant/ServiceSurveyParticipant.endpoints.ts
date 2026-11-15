// Generated from ServiceSurveyParticipant.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const surveyParticipantConfig = {
  service: 'surveyParticipant',
  path: '/survey-participant',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    create: {
      method: 'create',
      verbs: ['post'],
      path: '/:surveyId',
      data: {
        participant: { src: 'body', required: true },
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
    getMe: {
      method: 'getMe',
      verbs: ['get'],
      path: '/:surveyId/me',
      data: { surveyId: { src: 'param', required: false, type: String } },
      acl: { rules: [{ allow: true, role: 'participant' }] },
    },
    getOne: {
      method: 'getOne',
      verbs: ['get'],
      path: '/:surveyId/:participantId',
      data: {
        participantId: { src: 'param', required: true, type: String },
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
    getAll: {
      method: 'getAll',
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
        page: { src: 'query', required: false, type: Number, defaultValue: 1 },
        perPage: {
          src: 'query',
          required: false,
          type: Number,
          defaultValue: 10,
        },
        search: { src: 'query', required: false, type: String },
        completionStatus: { src: 'query', required: false, type: String },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    update: {
      method: 'update',
      verbs: ['put'],
      path: '/:surveyId/:participantId',
      data: {
        participantId: { src: 'param', required: true, type: String },
        surveyId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        participant: { src: 'body', required: true },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    delete: {
      method: 'delete',
      verbs: ['delete'],
      path: '/:surveyId/:participantId',
      data: {
        participantId: { src: 'param', required: true, type: String },
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
    resetInviteStatus: {
      method: 'resetInviteStatus',
      verbs: ['put'],
      path: '/:surveyId/:participantId/reset-invite-status',
      data: {
        participantId: { src: 'param', required: true, type: String },
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
    resetReminderStatus: {
      method: 'resetReminderStatus',
      verbs: ['put'],
      path: '/:surveyId/:participantId/reset-reminder-status',
      data: {
        participantId: { src: 'param', required: true, type: String },
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
  },
} satisfies ServerApiConfig

export default surveyParticipantConfig
