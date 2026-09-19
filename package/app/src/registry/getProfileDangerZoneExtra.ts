import { KEY_REGISTRY_PROFILE_DANGER_ZONE_EXTRA, Registry } from 'common'
import { ProfileDangerZoneExtra } from 'model'

const NoopProfileDangerZoneExtra: ProfileDangerZoneExtra = () => null

export const getProfileDangerZoneExtra = (): ProfileDangerZoneExtra => {
  return Registry.getInstance().get(
    KEY_REGISTRY_PROFILE_DANGER_ZONE_EXTRA,
    () => NoopProfileDangerZoneExtra,
  )
}
