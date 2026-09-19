import { Schema } from 'mzen-server'

export class SchemaMigrationLog extends Schema {
  constructor() {
    super({
      $name: 'migrationLog',
      $construct: 'MigrationLogEntry',
      $strict: true,
      _id: {
        $type: String,
        $validate: { required: true },
        $filter: { defaultValue: '' },
      },
      runId: {
        $type: String,
        $validate: { required: true, valueLength: { max: 255 } },
        $filter: { defaultValue: null },
      },
      dataSourceName: {
        $type: String,
        $validate: {
          required: true,
          inArray: { values: ['account', 'project'] },
        },
        $filter: { defaultValue: null },
      },
      contextKey: {
        $type: String,
        $validate: { required: true, valueLength: { max: 255 } },
        $filter: { defaultValue: null },
      },
      status: {
        $type: String,
        $validate: {
          required: true,
          inArray: { values: ['pending', 'running', 'success', 'failed'] },
        },
        $filter: { defaultValue: 'pending' },
      },
      attempts: {
        $type: Number,
        $filter: { defaultValue: 0 },
      },
      previousVersion: {
        $type: String,
        $filter: { defaultValue: null },
      },
      currentVersion: {
        $type: String,
        $filter: { defaultValue: null },
      },
      totalPatches: {
        $type: Number,
        $filter: { defaultValue: 0 },
      },
      successCount: {
        $type: Number,
        $filter: { defaultValue: 0 },
      },
      failedCount: {
        $type: Number,
        $filter: { defaultValue: 0 },
      },
      skippedCount: {
        $type: Number,
        $filter: { defaultValue: 0 },
      },
      patchResults: {
        $type: Array,
        $filter: { defaultValue: [] },
      },
      duration: {
        $type: Number,
        $filter: { defaultValue: null },
      },
      startedAt: {
        $type: Date,
        $filter: { defaultValue: null },
      },
      finishedAt: {
        $type: Date,
        $filter: { defaultValue: null },
      },
      error: {
        $type: String,
        $validate: { valueLength: { max: 10000 } },
        $filter: { defaultValue: null },
      },
      createdAt: {
        $type: Date,
        $validate: { required: true },
        $filter: { defaultValue: null },
      },
    })
  }
}

export default SchemaMigrationLog
