export const surveyParticipantConfig = {
  path: '/survey-participant',
  enable: true,
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    postSurveyParticipant: {
      service: 'surveyParticipant',
      path: '/:surveyId',
      method: 'create',
      verbs: ['post'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        participant: { src: 'body', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    getAllSurveyParticipant: {
      service: 'surveyParticipant',
      path: '/:surveyId',
      method: 'getAll',
      verbs: ['get'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        page: { src: 'query', default: 1 },
        perPage: { src: 'query', default: 10 },
        search: { src: 'query' },
        completionStatus: { src: 'query' },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    importSurveyParticipant: {
      service: 'surveyParticipantImport',
      path: '/:surveyId/import',
      method: 'import',
      verbs: ['post'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        file: { src: 'body', srcPath: 'file', required: true },
        batchSize: { src: 'body', srcPath: 'batchSize', default: 500 },
        response: { src: 'container', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    exportSurveyParticipant: {
      service: 'surveyParticipantExport',
      path: '/:surveyId/export',
      method: 'export',
      verbs: ['get'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        ids: { src: 'query' },
        response: { src: 'container', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    sendInvitesSurveyParticipant: {
      service: 'surveyParticipantEmail',
      path: '/:surveyId/send-invites',
      method: 'send',
      verbs: ['post'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        skip: { src: 'body', default: 0 },
        batchSize: { src: 'body', default: 100 },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    sendRemindersSurveyParticipant: {
      service: 'surveyParticipantEmail',
      path: '/:surveyId/send-reminders',
      method: 'sendReminders',
      verbs: ['post'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        skip: { src: 'body', default: 0 },
        batchSize: { src: 'body', default: 100 },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    generateSurveyParticipant: {
      service: 'surveyParticipantGenerate',
      path: '/:surveyId/generate',
      method: 'generate',
      verbs: ['post'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        count: { src: 'body', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    getSurveyParticipantMe: {
      service: 'surveyParticipant',
      path: '/:surveyId/me',
      method: 'getMe',
      verbs: ['get'],
      acl: {
        rules: [{ allow: true, role: 'participant' }],
      },
    },
    getSurveyParticipant: {
      service: 'surveyParticipant',
      path: '/:surveyId/:participantId',
      method: 'getOne',
      verbs: ['get'],
      data: {
        surveyId: { src: 'param', required: true },
        participantId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    updateSurveyParticipant: {
      service: 'surveyParticipant',
      path: '/:surveyId/:participantId',
      method: 'update',
      verbs: ['put'],
      data: {
        surveyId: { src: 'param', required: true },
        participantId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        participant: { src: 'body', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    deleteSurveyParticipant: {
      service: 'surveyParticipant',
      path: '/:surveyId/:participantId',
      method: 'delete',
      verbs: ['delete'],
      data: {
        surveyId: { src: 'param', required: true },
        participantId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    resetInviteStatusSurveyParticipant: {
      service: 'surveyParticipant',
      path: '/:surveyId/:participantId/reset-invite-status',
      method: 'resetInviteStatus',
      verbs: ['put'],
      data: {
        surveyId: { src: 'param', required: true },
        participantId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    resetReminderStatusSurveyParticipant: {
      service: 'surveyParticipant',
      path: '/:surveyId/:participantId/reset-reminder-status',
      method: 'resetReminderStatus',
      verbs: ['put'],
      data: {
        surveyId: { src: 'param', required: true },
        participantId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
  },
}

export default surveyParticipantConfig
