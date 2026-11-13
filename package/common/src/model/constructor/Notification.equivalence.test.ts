jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { SchemaNotification } from './Notification.schema'
import { Notification } from './Notification'

it('Notification behaves as recorded', () => {
  expect(
    constructorBehaviour(
      Notification,
      new SchemaNotification().builderFields(),
    ),
  ).toMatchSnapshot()
})
