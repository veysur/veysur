import { constructorBehaviour } from 'veysur-common/test-utils/constructorEquivalence'

import { SchemaTaskLock } from '../schema/SchemaTaskLock'
import { TaskLock } from './TaskLock'

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

it('TaskLock behaves as recorded', () => {
  expect(
    constructorBehaviour(TaskLock, new SchemaTaskLock().builderFields()),
  ).toMatchSnapshot()
})
