import { Cookie } from 'lucide-react'
import { useCookieConsent } from '../hook/useCookieConsent'

export default function CookieSettingsButton() {
  const { resetConsent } = useCookieConsent()

  return (
    <button
      onClick={resetConsent}
      title="Cookie Settings"
      className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
    >
      <Cookie size={14} />
      Cookie Settings
    </button>
  )
}
