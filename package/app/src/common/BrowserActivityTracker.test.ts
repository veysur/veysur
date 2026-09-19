import { BrowserActivityTracker } from './BrowserActivityTracker'

describe('BrowserActivityTracker', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('should start and stop tracking', () => {
    const tracker = new BrowserActivityTracker()
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

    tracker.startTracking()
    expect(addEventListenerSpy).toHaveBeenCalledTimes(7) // 7 events are tracked

    tracker.stopTracking()
    expect(removeEventListenerSpy).toHaveBeenCalledTimes(7)

    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })

  test('should call inactivityCallback after threshold', () => {
    const inactivityCallback = jest.fn()
    const tracker = new BrowserActivityTracker(1000, inactivityCallback)

    tracker.startTracking()
    jest.advanceTimersByTime(999)
    expect(inactivityCallback).not.toHaveBeenCalled()

    jest.advanceTimersByTime(1)
    expect(inactivityCallback).toHaveBeenCalledTimes(1)

    tracker.stopTracking()
  })

  test('should call activityCallback when user becomes active again', () => {
    const inactivityCallback = jest.fn()
    const activityCallback = jest.fn()
    const tracker = new BrowserActivityTracker(
      1000,
      inactivityCallback,
      activityCallback,
    )

    tracker.startTracking()
    jest.advanceTimersByTime(1000)
    expect(inactivityCallback).toHaveBeenCalledTimes(1)

    // Simulate user activity
    window.dispatchEvent(new Event('mousemove'))

    expect(activityCallback).toHaveBeenCalledTimes(1)

    tracker.stopTracking()
  })

  test('should return correct inactivity duration', () => {
    const tracker = new BrowserActivityTracker(1000)
    tracker.startTracking()

    jest.advanceTimersByTime(1000)
    expect(tracker.getInactiveDuration()).toBe(1000)

    jest.advanceTimersByTime(1500)
    expect(tracker.getInactiveDuration()).toBe(2500)

    tracker.stopTracking()
  })

  test('should pass tracker instance to inactivityCallback', () => {
    const inactivityCallback = jest.fn()
    const tracker = new BrowserActivityTracker(1000, inactivityCallback)

    tracker.startTracking()
    jest.advanceTimersByTime(1000)

    expect(inactivityCallback).toHaveBeenCalledTimes(1)
    expect(inactivityCallback).toHaveBeenCalledWith(tracker)

    tracker.stopTracking()
  })

  test('should pass tracker instance to activityCallback', () => {
    const inactivityCallback = jest.fn()
    const activityCallback = jest.fn()
    const tracker = new BrowserActivityTracker(
      1000,
      inactivityCallback,
      activityCallback,
    )

    tracker.startTracking()
    jest.advanceTimersByTime(1000)

    // Simulate user activity
    window.dispatchEvent(new Event('mousemove'))

    expect(activityCallback).toHaveBeenCalledTimes(1)
    expect(activityCallback).toHaveBeenCalledWith(tracker)

    tracker.stopTracking()
  })

  test('callbacks should have access to tracker methods', () => {
    let inactivityDuration: number | null = null
    let isInactiveStatus: boolean | null = null

    const inactivityCallback = (tracker: BrowserActivityTracker) => {
      inactivityDuration = tracker.getInactiveDuration()
      isInactiveStatus = tracker.isInactive()
    }

    const tracker = new BrowserActivityTracker(1000, inactivityCallback)

    tracker.startTracking()
    jest.advanceTimersByTime(1000)

    expect(inactivityDuration).toBe(1000)
    expect(isInactiveStatus).toBe(true)

    tracker.stopTracking()
  })

  test('should correctly determine if user is inactive', () => {
    const tracker = new BrowserActivityTracker(2000)
    tracker.startTracking()

    jest.advanceTimersByTime(1500)
    expect(tracker.isInactive()).toBe(false)

    jest.advanceTimersByTime(1500)
    expect(tracker.isInactive()).toBe(true)

    tracker.stopTracking()
  })
})
