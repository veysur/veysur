import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from 'component/shadcn/button'
import { hasInAppBackHistory } from 'common'

interface BackButtonProps {
  /** The text to display next to the back arrow */
  label?: string
  /**
   * The fallback URL to navigate to if there is no tracked in-app
   * predecessor page. Optional — if omitted, the button only works when
   * `hasInAppBackHistory()` is true, so callers should hide the button
   * entirely otherwise (see `PageHeader`).
   */
  fallbackUrl?: string
  /** Optional click handler that runs before navigation */
  onClick?: () => void
  /** Optional className for custom styling */
  className?: string
}

/**
 * A reusable back button component with smart navigation.
 *
 * - Uses browser history.back() if there is a tracked in-app predecessor page
 * - Falls back to the provided URL for a fresh tab / direct deep link
 */
export const BackButton: React.FC<BackButtonProps> = ({
  label = 'Back',
  fallbackUrl,
  onClick,
  className = '',
}) => {
  const navigate = useNavigate()

  const handleClick = () => {
    // If custom click handler provided, use that instead
    if (onClick) {
      onClick()
      return
    }

    if (hasInAppBackHistory()) {
      navigate(-1)
    } else if (fallbackUrl) {
      navigate(fallbackUrl)
    }
  }

  return (
    <div className={`flex items-start ${className}`}>
      <Button
        variant="link"
        className="h-auto p-0 has-[>svg]:px-0"
        onClick={handleClick}
        tooltip="Back"
      >
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Button>
    </div>
  )
}
