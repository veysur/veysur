import React from 'react'
import { useTranslation } from 'react-i18next'

import { BotProtectionCheck, BotProtectionLabels } from './BotProtectionCheck'
import {
  BotChallenge,
  BotProtectionProviderName,
} from './BotProtectionProvider'

type Props = {
  provider: BotProtectionProviderName
  siteKey: string
  verified: boolean
  fetchChallenge: () => Promise<BotChallenge>
  /** Sends the provider token and the honeypot value to the API. */
  verify: (token: string, honeypot: string) => Promise<void>
}

/** The survey's bot check: `BotProtectionCheck` with the `app-survey` strings. */
export const BotProtectionGate: React.FC<Props> = (props) => {
  const { t } = useTranslation('app-survey')
  const labels: BotProtectionLabels = {
    label: t('botProtection.label'),
    checking: t('botProtection.checking'),
    verified: t('botProtection.verified'),
    failed: t('botProtection.failed'),
    retry: t('botProtection.retry'),
    providerCloudflare: t('botProtection.providerCloudflare'),
    providerGoogle: t('botProtection.providerGoogle'),
  }
  return <BotProtectionCheck {...props} labels={labels} />
}
