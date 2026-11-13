import { nestedSettingMethods } from './nestedSettingMethods'

export const AccessMethods = nestedSettingMethods('access', {
  anonymous: false,
  open: false,
  publicReg: false,
  index: false,
  tokenPersist: true,
  multiple: false,
  preventRepeat: false,
  resumeLink: false,
  botProtection: false,
  embed: false,
  embedDomains: [],
})
