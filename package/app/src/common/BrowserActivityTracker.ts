const DEFAULT_INACTIVITY_THRESHOLD_MS = 60000

/**
 * Tracks user inactivity time on a webpage
 */
export class BrowserActivityTracker {
  private lastActivityTime: number
  private inactivityTimer: number | null
  private isTracking: boolean
  private readonly activityEvents: string[]

  constructor(
    private readonly inactivityThreshold: number = DEFAULT_INACTIVITY_THRESHOLD_MS,
    private readonly inactivityCallback?: (
      tracker: BrowserActivityTracker,
    ) => void,
    private readonly activityCallback?: (
      tracker: BrowserActivityTracker,
    ) => void,
  ) {
    this.lastActivityTime = Date.now()
    this.inactivityTimer = null
    this.isTracking = false
    this.activityEvents = [
      'mousemove',
      'keydown',
      'wheel',
      'scroll',
      'touchstart',
      'click',
      'mousedown',
    ]
  }

  private handleActivity = (): void => {
    const wasInactive = this.isInactive()
    this.lastActivityTime = Date.now()

    if (wasInactive && this.activityCallback) {
      this.activityCallback(this)
    }

    // Reset the inactivity timer
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer)
    }
    if (this.isTracking) {
      this.inactivityTimer = window.setTimeout(
        this.checkInactivity,
        this.inactivityThreshold,
      )
    }
  }

  private checkInactivity = (): void => {
    if (this.isTracking && this.inactivityCallback) {
      this.inactivityCallback(this)
    }
  }

  public startTracking(): void {
    if (this.isTracking) return

    this.isTracking = true
    this.lastActivityTime = Date.now()

    // Add event listeners for all activity events
    this.activityEvents.forEach((event) => {
      window.addEventListener(event, this.handleActivity, { passive: true })
    })

    // Start the inactivity timer
    this.inactivityTimer = window.setTimeout(
      this.checkInactivity,
      this.inactivityThreshold,
    )
  }

  public stopTracking(): void {
    if (!this.isTracking) return

    this.isTracking = false

    // Remove all event listeners
    this.activityEvents.forEach((event) => {
      window.removeEventListener(event, this.handleActivity)
    })

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer)
      this.inactivityTimer = null
    }
  }

  public getInactiveDuration(): number {
    return Date.now() - this.lastActivityTime
  }

  public isInactive(): boolean {
    return this.getInactiveDuration() >= this.inactivityThreshold
  }
}

// Example usage:
// const tracker = new BrowserActivityTracker(
//   30000, // 30 seconds
//   () => console.log('User is inactive'),
//   () => console.log('User is active again')
// );
// tracker.startTracking();
