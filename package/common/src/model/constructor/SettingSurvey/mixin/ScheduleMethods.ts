import { Constructor } from '../../../type'
import { SettingSurveyMixinBase } from './SettingSurveyMixinBase'

const defaultSchedule = {
  start: null,
  end: null,
}

export function ScheduleMethods<T extends Constructor<SettingSurveyMixinBase>>(
  Base: T,
) {
  return class extends Base {
    setScheduleProperty(key: string, value: unknown): this {
      return this.setNestedProperty(
        this.schedule,
        defaultSchedule,
        'schedule',
        key,
        value,
      )
    }

    updateSchedule(updates: Record<string, unknown>): this {
      return this.updateNestedProperty(
        this.schedule,
        defaultSchedule,
        'schedule',
        updates,
      )
    }
  }
}
