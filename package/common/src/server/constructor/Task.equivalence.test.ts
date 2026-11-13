jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { SchemaTask } from './Task.schema'
import { Task } from './Task'

it('Task behaves as recorded', () => {
  expect(
    constructorBehaviour(Task, new SchemaTask().builderFields()),
  ).toMatchSnapshot()
})
