import { ScheduleMethods } from './ScheduleMethods'
import { SettingSurveyCoreMethods } from './SettingSurveyCoreMethods'

class TestBase {
  schedule:
    | {
        start: Date | null
        end: Date | null
      }
    | undefined = {
    start: null,
    end: null,
  }

  constructor(data?: {
    schedule?: { start?: Date | null; end?: Date | null }
  }) {
    if (data?.schedule) {
      this.schedule = { ...this.schedule, ...data.schedule }
    }
  }

  newInstance(changes?: Record<string, unknown>): this {
    if (!changes || Object.keys(changes).length === 0) {
      return this
    }
    const Ctor = this.constructor as new (data: unknown) => this
    return new Ctor({ ...this, ...changes })
  }
}

const TestClass = ScheduleMethods(SettingSurveyCoreMethods(TestBase))

describe('ScheduleMethods', () => {
  let instance: InstanceType<typeof TestClass>

  beforeEach(() => {
    instance = new TestClass()
  })

  describe('setScheduleProperty', () => {
    it('should set start date property', () => {
      const startDate = new Date('2024-01-01')
      const result = instance.setScheduleProperty('start', startDate)

      expect(result).toBeInstanceOf(TestClass)
      expect(result).not.toBe(instance)
      expect(result.schedule.start).toEqual(startDate)
      expect(result.schedule.end).toBeNull()
    })

    it('should set end date property', () => {
      const endDate = new Date('2024-12-31')
      const result = instance.setScheduleProperty('end', endDate)

      expect(result).toBeInstanceOf(TestClass)
      expect(result).not.toBe(instance)
      expect(result.schedule.start).toBeNull()
      expect(result.schedule.end).toEqual(endDate)
    })

    it('should handle null values', () => {
      instance = new TestClass({
        schedule: { start: new Date(), end: new Date() },
      })
      const result = instance.setScheduleProperty('start', null)

      expect(result.schedule.start).toBeNull()
    })

    it('should return same instance when setting identical value', () => {
      const startDate = new Date('2024-01-01')
      instance = new TestClass({ schedule: { start: startDate, end: null } })
      const result = instance.setScheduleProperty('start', startDate)

      expect(result).toBe(instance)
    })

    it('should handle undefined schedule object', () => {
      instance.schedule = undefined
      const startDate = new Date('2024-01-01')
      const result = instance.setScheduleProperty('start', startDate)

      expect(result.schedule.start).toEqual(startDate)
      expect(result.schedule.end).toBeNull()
    })
  })

  describe('updateSchedule', () => {
    it('should update multiple properties at once', () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-12-31')
      const updates = { start: startDate, end: endDate }

      const result = instance.updateSchedule(updates)

      expect(result).toBeInstanceOf(TestClass)
      expect(result).not.toBe(instance)
      expect(result.schedule.start).toEqual(startDate)
      expect(result.schedule.end).toEqual(endDate)
    })

    it('should update single property', () => {
      const startDate = new Date('2024-06-15')
      const result = instance.updateSchedule({ start: startDate })

      expect(result.schedule.start).toEqual(startDate)
      expect(result.schedule.end).toBeNull()
    })

    it('should handle partial updates', () => {
      instance = new TestClass({
        schedule: {
          start: new Date('2024-01-01'),
          end: new Date('2024-06-01'),
        },
      })

      const newEndDate = new Date('2024-12-31')
      const result = instance.updateSchedule({ end: newEndDate })

      expect(result.schedule.start).toEqual(new Date('2024-01-01'))
      expect(result.schedule.end).toEqual(newEndDate)
    })

    it('should return same instance when no changes occur', () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-12-31')
      instance = new TestClass({
        schedule: { start: startDate, end: endDate },
      })

      const result = instance.updateSchedule({ start: startDate, end: endDate })

      expect(result).toBe(instance)
    })

    it('should handle empty updates', () => {
      const result = instance.updateSchedule({})

      expect(result).toBe(instance)
    })

    it('should handle undefined schedule object in updateSchedule', () => {
      instance.schedule = undefined
      const updates = { start: new Date('2024-01-01'), end: null }
      const result = instance.updateSchedule(updates)

      expect(result.schedule).toEqual({
        start: new Date('2024-01-01'),
        end: null,
      })
    })
  })

  describe('property validation', () => {
    it('should handle Date objects correctly', () => {
      const date = new Date('2024-01-01T10:00:00Z')
      const result = instance.setScheduleProperty('start', date)

      expect(result.schedule.start).toEqual(date)
      expect(result.schedule.start instanceof Date).toBe(true)
    })

    it('should handle null values correctly', () => {
      const result = instance.updateSchedule({ start: null, end: null })

      expect(result.schedule.start).toBeNull()
      expect(result.schedule.end).toBeNull()
    })

    it('should preserve immutability', () => {
      const originalSchedule = { ...instance.schedule }
      instance.setScheduleProperty('start', new Date())

      expect(instance.schedule).toEqual(originalSchedule)
    })
  })

  describe('edge cases', () => {
    it('should handle setting start date after end date', () => {
      const endDate = new Date('2024-06-01')
      const startDate = new Date('2024-12-01')

      let result = instance.setScheduleProperty('end', endDate)
      result = result.setScheduleProperty('start', startDate)

      expect(result.schedule.start).toEqual(startDate)
      expect(result.schedule.end).toEqual(endDate)
    })

    it('should handle invalid date values gracefully', () => {
      const invalidDate = new Date('invalid')
      const result = instance.setScheduleProperty('start', invalidDate)

      expect(result.schedule.start).toEqual(invalidDate)
    })

    it('should handle unknown properties by ignoring them', () => {
      const result = instance.setScheduleProperty('unknown', 'value')

      expect(result.schedule).toHaveProperty('unknown', 'value')
    })
  })
})
