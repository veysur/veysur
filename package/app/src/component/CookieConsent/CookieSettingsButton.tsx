import React from 'react'
import { Cookie } from 'lucide-react'

import { useCookieConsent } from './useCookieConsent'

export const CookieSettingsButton: React.FC = () => {
  const { resetConsent } = useCookieConsent()

  return (
    <button
      onClick={resetConsent}
      title="Cookie Settings"
      className="inline-flex items-center gap-1.5 text-muted-foreground/60 transition-colors hover:text-muted-foreground cursor-pointer text-xs"
    >
      <Cookie size={14} />
      Cookie Settings
    </button>
  )
}
