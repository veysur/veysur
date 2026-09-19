export const surveyParticipantAttributeConfig = {
  path: '/survey-participant-attribute',
  enable: true,
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    getAllSurveyParticipantAttribute: {
      service: 'surveyParticipantAttribute',
      path: '/:surveyId',
      method: 'list',
      verbs: ['get'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    postSurveyParticipantAttribute: {
      service: 'surveyParticipantAttribute',
      path: '/:surveyId',
      method: 'create',
      verbs: ['post'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        attribute: { src: 'body', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    deleteSurveyParticipantAttribute: {
      service: 'surveyParticipantAttribute',
      path: '/:surveyId/:attributeName',
      method: 'delete',
      verbs: ['delete'],
      data: {
        surveyId: { src: 'param', required: true },
        attributeName: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    batchSaveSurveyParticipantAttribute: {
      service: 'surveyParticipantAttribute',
      path: '/:surveyId',
      method: 'batchSave',
      verbs: ['patch'],
      data: {
        surveyId: { src: 'param', required: true },
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        changes: { src: 'body', required: true },
        orderedAttributeNames: { src: 'body', required: false },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
  },
}

export default surveyParticipantAttributeConfig
