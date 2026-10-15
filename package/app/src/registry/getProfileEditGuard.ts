import { KEY_REGISTRY_PROFILE_EDIT_GUARD, Registry } from 'common'
import { ProfileEditGuard } from 'model'

const PassThroughProfileEditGuard: ProfileEditGuard = ({ children }) => children

export const getProfileEditGuard = (): ProfileEditGuard => {
  return Registry.getInstance().get(
    KEY_REGISTRY_PROFILE_EDIT_GUARD,
    () => PassThroughProfileEditGuard,
  )
}
