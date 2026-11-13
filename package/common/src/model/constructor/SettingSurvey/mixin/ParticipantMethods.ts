import { nestedSettingMethods } from './nestedSettingMethods'

export const ParticipantMethods = nestedSettingMethods('participant', {
  htmlEmail: true,
  thankYouEmail: true,
  tokenLength: 16,
})
