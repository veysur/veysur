jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { taskSpec } from '../schema/SchemaTask'
import { Task } from './Task'

it('Task behaves as recorded', () => {
  expect(constructorBehaviour(Task, taskSpec)).toMatchSnapshot()
})
