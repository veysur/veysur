import { useEffect, useEffectEvent, useRef } from 'react'

import type { LoginDefaults } from 'model'

// cspell:ignore lpignore bwignore
const PASSWORD_MANAGER_OPT_OUT = {
  'data-lpignore': 'true',
  'data-1p-ignore': true,
  'data-bwignore': 'true',
}

type Params = {
  loginDefaults: LoginDefaults | null
  botReady: boolean
  formError: string | null
  /** Replaces the form values, in case a password manager autofilled over the defaults. */
  resetForm: (values: { email: string; password: string }) => void
  submit: () => Promise<void>
}

/** Signs in once with the registered login defaults when they ask for it and the bot check is ready. */
export const useLoginAutoSubmit = ({
  loginDefaults,
  botReady,
  formError,
  resetForm,
  submit,
}: Params) => {
  const autoSubmitted = useRef(false)
  const enabled = !!loginDefaults?.autoSubmit

  const signIn = useEffectEvent(() => {
    if (!loginDefaults) return
    resetForm({ email: loginDefaults.email, password: loginDefaults.password })
    void submit()
  })

  useEffect(() => {
    if (!enabled || autoSubmitted.current || !botReady) return
    autoSubmitted.current = true
    signIn()
  }, [enabled, botReady])

  return {
    autoSigningIn: enabled && !formError,
    passwordManagerOptOut: enabled ? PASSWORD_MANAGER_OPT_OUT : {},
  }
}
