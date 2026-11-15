// Generated from ServiceContact.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const contactConfig = {
  service: 'contact',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    submit: {
      method: 'submit',
      verbs: ['post'],
      path: '/submit',
      data: {
        name: { src: 'body', required: true, type: String },
        email: { src: 'body', required: true, type: String },
        subject: { src: 'body', required: true, type: String },
        message: { src: 'body', required: true, type: String },
      },
      acl: { rules: [{ allow: true, role: 'all' }] },
    },
  },
} satisfies ServerApiConfig

export default contactConfig
