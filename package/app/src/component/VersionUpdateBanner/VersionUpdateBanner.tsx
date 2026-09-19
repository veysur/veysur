import React, { useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { Button } from 'component/shadcn/button'
import { versionMismatchStore } from 'common/versionMismatchStore'

export const VersionUpdateBanner: React.FC = () => {
  const mismatch = versionMismatchStore((state) => state.mismatch)
  const [dismissed, setDismissed] = useState(false)

  if (!mismatch || dismissed) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 bg-primary px-4 py-2 text-primary-foreground shadow-md">
      <div className="flex items-center gap-2 text-sm">
        <RefreshCw size={14} className="shrink-0" />
        <span>A new version is available. Refresh to get the latest.</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => window.location.reload()}
        >
          Refresh
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded p-1 hover:bg-primary-foreground/10"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

export default VersionUpdateBanner
