import { nestedSettingMethods } from './nestedSettingMethods'

export const DataMethods = nestedSettingMethods('data', {
  timestamp: false,
  ip: false,
  anonymiseIp: false,
  referrerUrl: false,
  timings: false,
  assessment: false,
})
