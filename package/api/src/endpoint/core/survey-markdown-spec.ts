export const surveyMarkdownSpecConfig = {
  service: 'surveyMarkdownSpec',
  acl: {
    rules: [{ allow: true, role: 'all' }],
  },
  endpoints: {
    getSurveyMarkdownSpec: {
      path: '/',
      method: 'download',
      verbs: ['get'],
      data: {
        response: { src: 'container', required: true },
      },
    },
  },
}

export default surveyMarkdownSpecConfig
