import { genUniqueId } from '@datacapy/id'

import {
  BOT_PROTECTION_PROVIDER_NONE,
  ResolvedBotProtection,
} from '../service/BotProtectionConfig'
import { ResolvedMapConfig } from '../service/MapConfig'

export interface SettingProjectKeys {
  siteKey: string
  secretKey: string
}

export interface SettingProjectData {
  _id: string
  maps?: {
    googleApiKey?: string | null
    provider?: string | null
  } | null
  botProtection?: {
    provider?: string | null
    cloudflare?: Partial<SettingProjectKeys> | null
    google?: Partial<SettingProjectKeys> | null
  } | null
  createdAt: Date
  updatedAt: Date
}

/**
 * The project settings as a participant may see them: the effective map
 * provider and key, and the bot check with no secret key.
 */
export interface SettingProjectGated {
  maps: ResolvedMapConfig
  botProtection: ResolvedBotProtection
}

// Keep the default for any key whose incoming value is null/undefined (schema
// validation fills unset fields with null)
function mergeDefined<T extends object>(
  defaults: T,
  incoming: Partial<T> | null | undefined,
): T {
  const merged = { ...defaults }
  for (const key of Object.keys(incoming ?? {}) as (keyof T)[]) {
    if (incoming[key] !== null && incoming[key] !== undefined) {
      merged[key] = incoming[key] as T[keyof T]
    }
  }
  return merged
}

/**
 * Project-wide settings that carry provider keys, kept out of `SettingSurvey`
 * because that document is read by the editor, the participant path and the
 * embed pointer. Maps and bot protection only.
 */
export class SettingProject {
  _id: string
  maps: { googleApiKey: string; provider?: string }
  botProtection: {
    provider: string
    cloudflare: SettingProjectKeys
    google: SettingProjectKeys
  }
  createdAt: Date
  updatedAt: Date

  constructor(data: Partial<SettingProjectData> = {}) {
    this._id = data._id || genUniqueId()
    this.maps = {
      googleApiKey: data.maps?.googleApiKey ?? '',
      ...(data.maps?.provider ? { provider: data.maps.provider } : {}),
    }
    const empty: SettingProjectKeys = { siteKey: '', secretKey: '' }
    this.botProtection = {
      provider: data.botProtection?.provider || BOT_PROTECTION_PROVIDER_NONE,
      cloudflare: mergeDefined(empty, data.botProtection?.cloudflare),
      google: mergeDefined(empty, data.botProtection?.google),
    }
    this.createdAt = (data.createdAt && new Date(data.createdAt)) || new Date()
    this.updatedAt = (data.updatedAt && new Date(data.updatedAt)) || new Date()
  }
}
