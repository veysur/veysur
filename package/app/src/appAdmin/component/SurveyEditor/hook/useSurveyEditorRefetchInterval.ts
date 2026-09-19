import { useState, useEffect } from 'react'

import { BrowserActivityTracker } from 'common'

const ONE_SECOND = 1000
const ONE_MINUTE = 60 * 1000

const REFETCH_INTERVAL_ACTIVE = ONE_SECOND * 20
const INACTIVE_INTERVAL = ONE_MINUTE
const REFETCH_INTERVAL_INACTIVE_EXPONENT = 1.05

export function useSurveyEditorRefetchInterval() {
  const [refetchInterval, setRefetchInterval] = useState(
    REFETCH_INTERVAL_ACTIVE,
  )

  const handleInactivity = (tracker: BrowserActivityTracker) => {
    if (tracker.isInactive()) {
      setRefetchInterval(
        Math.pow(INACTIVE_INTERVAL, REFETCH_INTERVAL_INACTIVE_EXPONENT),
      )
    } else {
      setRefetchInterval(REFETCH_INTERVAL_ACTIVE)
    }
  }

  const handleBecameActive = () => {
    setRefetchInterval(REFETCH_INTERVAL_ACTIVE)
  }

  useEffect(() => {
    const tracker = new BrowserActivityTracker(
      INACTIVE_INTERVAL,
      handleInactivity,
      handleBecameActive,
    )
    tracker.startTracking()
    return () => {
      tracker?.stopTracking()
    }
  }, [])

  return {
    refetchInterval,
  }
}
