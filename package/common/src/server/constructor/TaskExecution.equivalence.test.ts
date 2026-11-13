jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { SchemaTaskExecution } from './TaskExecution.schema'
import { TaskExecution } from './TaskExecution'

it('TaskExecution behaves as recorded', () => {
  expect(
    constructorBehaviour(
      TaskExecution,
      new SchemaTaskExecution().builderFields(),
    ),
  ).toMatchSnapshot()
})
