import momentTimezone from 'moment-timezone'
import { useEffect } from 'react'
import { useIsRestoring, useQuery, useQueryClient } from '@tanstack/react-query'
import { Project, ProjectAdmin } from 'veysur-common'
import { PropsOf } from 'mzen-schema'

import {
  KEY_STATE_AUTH,
  KEY_STATE_REMEMBER_ME,
  KEY_STATE_2FA_PROMPTED,
} from 'common/keyState'
import { stripFunctions } from 'common'
import { clearPersistedCache } from 'common/queryClient'
import { getApiAuth, getRestClient } from 'registry'
import { PreAuthData } from 'model/api/ApiAuth'

import { authRefreshWithRetry as authRefreshWithRetryUtil } from './useAuth/authRefreshWithRetry'

export type AuthData = {
  client: {
    _id: string
  }
  user: {
    nameFirst: string
    nameLast: string
    email: string
    emailMeta?: {
      verify: {
        status: {
          isVerified: boolean
          isVerifiedAt: Date | null
        }
      }
    }
    billingAddress?: {
      line1?: string
      line2?: string
      city?: string
      state?: string
      postcode?: string
      country?: string
    }
    taxId?: string
    businessName?: string
    twoFactorMeta?: {
      enabled: boolean
      enabledAt?: Date | null
      prompt?: { dismissed: boolean }
    }
    deletedAt?: Date | null
    projectOwn: Array<PropsOf<Project>>
    projectAdmin: Array<PropsOf<ProjectAdmin>>
  }
  accessToken: {
    token: string
    ip: string
    ttl: number
    createdAt: Date
    expiresAt: Date
  }
  jwt: {
    token: string
    created: Date
    expires: Date
  }
} | null

export function useAuth() {
  const queryClient = useQueryClient()
  const isRestoring = useIsRestoring()

  // `enabled: !isRestoring` stops this query from fetching (and thus resolving to `null` with a
  // fresh dataUpdatedAt) before the persisted-cache restore completes — otherwise the live
  // resolution would win the hydrate race and permanently discard a real, older-timestamped
  // restored session. See `common/queryClient.ts` for the persistence setup.
  const { data: auth } = useQuery<AuthData>(
    {
      queryKey: [KEY_STATE_AUTH],
      queryFn: async () => null,
      staleTime: Infinity,
      enabled: !isRestoring,
    },
    queryClient,
  )

  const setAuth = (auth: AuthData) => {
    queryClient.setQueryData(
      [KEY_STATE_AUTH],
      () => (auth && stripFunctions(auth)) || auth,
    )
  }

  // If we don't have a valid jwt or it is expiring refresh it using long lived access token
  const authRefresh = async (
    force?: boolean,
  ): Promise<AuthData | undefined> => {
    // Read latest auth from cache to avoid stale closure issues
    const currentAuth = queryClient.getQueryData<AuthData>([KEY_STATE_AUTH])

    const client = currentAuth?.client
    const user = currentAuth?.user
    const jwt = currentAuth?.jwt
    const accessToken = currentAuth?.accessToken
    if (!client || !user || !jwt || !accessToken) return undefined
    if (
      !force &&
      momentTimezone(jwt.expires).isAfter(momentTimezone().add(2, 'seconds'))
    ) {
      // No need to refresh as JWT is still valid
      return currentAuth
    }
    if (momentTimezone(accessToken.expiresAt).isBefore(momentTimezone())) {
      // Cannot refresh as the token has expired
      logout()
      throw new Error('Access token expired')
    }
    const result = await getApiAuth().refresh(client._id, accessToken.token)
    if (result?.client && result?.user && result?.accessToken && result?.jwt) {
      setAuth(result)
      // Update headers immediately to avoid race condition with useEffect
      getRestClient().setDefaultHeaders({
        Authorization: 'Bearer ' + result.jwt.token,
      })
      return result
    }
    return undefined
  }

  const loginEmailPassword = async (
    email: string,
    password: string,
    rememberMe = false,
  ): Promise<true | PreAuthData> => {
    const result = await getApiAuth().login(email, password)
    if (result && 'requiresTwoFactor' in result && result.requiresTwoFactor) {
      return result as PreAuthData
    }
    const authResult = result as AuthData
    if (
      authResult?.client &&
      authResult?.user &&
      authResult?.accessToken &&
      authResult?.jwt
    ) {
      clearPersistedCache()
      queryClient.setQueryData([KEY_STATE_REMEMBER_ME], rememberMe)
      setAuth(authResult)
      return true
    }
    return result as PreAuthData
  }

  const setupAndLogin = async (
    preAuthToken: string,
    code: string,
    secret: string,
    rememberMe = false,
  ): Promise<true> => {
    const result = await getApiAuth().enableAndLogin(preAuthToken, code, secret)
    if (result?.client && result?.user && result?.accessToken && result?.jwt) {
      clearPersistedCache()
      queryClient.setQueryData([KEY_STATE_REMEMBER_ME], rememberMe)
      setAuth(result)
      return true
    }
    throw new Error('Unexpected response from 2FA setup')
  }

  const verifyTwoFactor = async (
    preAuthToken: string,
    code: string,
    rememberMe = false,
  ): Promise<true> => {
    const result = await getApiAuth().verifyTwoFactor(preAuthToken, code)
    if (result?.client && result?.user && result?.accessToken && result?.jwt) {
      clearPersistedCache()
      queryClient.setQueryData([KEY_STATE_REMEMBER_ME], rememberMe)
      setAuth(result)
      return true
    }
    throw new Error('Unexpected response from 2FA verification')
  }

  const signupEmailPassword = async (data: {
    nameFirst: string
    nameLast: string
    email: string
    password: string
  }) => {
    const result = await getApiAuth().signup(data)
    if (result?.client && result?.user && result?.accessToken && result?.jwt) {
      setAuth(result)
      return true
    }
    return result
  }

  const logout = () => {
    clearPersistedCache()
    queryClient.removeQueries({ queryKey: [KEY_STATE_REMEMBER_ME] })
    queryClient.removeQueries({ queryKey: [KEY_STATE_2FA_PROMPTED] })
    setAuth(null)
    const client = auth?.client
    const accessToken = auth?.accessToken
    if (client && accessToken) {
      // we don't need to wait for this - we don't care if it fails
      try {
        getApiAuth().delete(client._id, accessToken.token)
      } catch {
        console.log('auth logout failed')
      }
    }
  }

  const authRefreshWithRetry = async () => {
    return authRefreshWithRetryUtil({
      authRefresh,
      logout,
    })
  }

  useEffect(() => {
    if (auth?.jwt) {
      getRestClient().setDefaultHeaders({
        Authorization: 'Bearer ' + auth?.jwt.token,
      })
    }
  }, [auth?.jwt])

  useEffect(() => {
    getRestClient().setJwtRefresher(async () => {
      await authRefreshWithRetry()
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isAuthed =
    !!auth?.client && !!auth?.user && !!auth?.accessToken && !!auth?.jwt

  return {
    isAuthed,
    auth,
    setAuth,
    logout,
    loginEmailPassword,
    verifyTwoFactor,
    setupAndLogin,
    signupEmailPassword,
    authRefresh,
    authRefreshWithRetry,
  }
}
