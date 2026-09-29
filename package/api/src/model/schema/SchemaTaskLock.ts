import { Schema } from '@datacapy/server'

export class SchemaTaskLock extends Schema {
  constructor() {
    super({
      $name: 'taskLock',
      $construct: 'TaskLock',
      $strict: true,
      _id: {
        $type: String,
        $validate: { required: true },
        $filter: { defaultValue: '' },
      },
      lockKey: {
        $type: String,
        $validate: { required: true, valueLength: { max: 255 } },
        $filter: { defaultValue: null },
      },
      resourceType: {
        $type: String,
        $validate: { required: true, valueLength: { max: 100 } },
        $filter: { defaultValue: null },
      },
      resourceId: {
        $type: String,
        $validate: { required: true, valueLength: { max: 255 } },
        $filter: { defaultValue: null },
      },
      executionId: {
        $type: String,
        $validate: { required: true, valueLength: { max: 255 } },
        $filter: { defaultValue: null },
      },
      lockedAt: {
        $type: Date,
        $validate: { required: true },
        $filter: { defaultValue: null },
      },
      expiresAt: {
        $type: Date,
        $validate: { required: true },
        $filter: { defaultValue: null },
      },
      note: {
        $type: String,
        $validate: { valueLength: { max: 1000 } },
        $filter: { defaultValue: null },
      },
    })
  }
}

export default SchemaTaskLock
