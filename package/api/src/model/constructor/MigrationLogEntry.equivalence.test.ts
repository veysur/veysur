import { constructorBehaviour } from 'veysur-common/test-utils/constructorEquivalence'

import { SchemaMigrationLog } from '../schema/SchemaMigrationLog'
import { MigrationLogEntry } from './MigrationLogEntry'

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

it('MigrationLogEntry behaves as recorded', () => {
  expect(
    constructorBehaviour(
      MigrationLogEntry,
      new SchemaMigrationLog().builderFields(),
    ),
  ).toMatchSnapshot()
})
