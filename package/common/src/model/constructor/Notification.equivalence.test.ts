jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { notificationSpec } from '../schema/SchemaNotification'
import { Notification } from './Notification'

it('Notification behaves as recorded', () => {
  expect(constructorBehaviour(Notification, notificationSpec)).toMatchSnapshot()
})
