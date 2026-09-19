export const contactConfig = {
  service: 'contact',
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    postSubmit: {
      path: '/submit',
      method: 'submit',
      verbs: ['post'],
      data: {
        name: { src: 'body', required: true },
        email: { src: 'body', required: true },
        subject: { src: 'body', required: true },
        message: { src: 'body', required: true },
      },
      acl: { rules: [{ allow: true, role: 'all' }] },
    },
  },
}

export default contactConfig
