import { nestedSettingMethods } from './nestedSettingMethods'

export const ContentFormatMethods = nestedSettingMethods('contentFormat', {
  htmlAllowed: false,
  markdownAllowed: true,
  scriptTagsAllowed: false,
})
