import momentTimezone from 'moment-timezone'
import { AuthData } from 'hook'

export const preApiRequestAuthCheck = (auth?: AuthData) => {
  if (
    !auth?.accessToken ||
    momentTimezone(auth.accessToken.expiresAt).isBefore(momentTimezone())
  )
    return Promise.reject('Invalid JWT')
}
