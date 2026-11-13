jest.useRealTimers()

import {
  expectValidAndStrict,
  schemaBehaviour,
} from '../../test-utils/schemaEquivalence'
import { SchemaNotification } from './Notification.schema'

it('SchemaNotification validates as recorded and rejects unknown keys', async () => {
  const behaviour = await schemaBehaviour(new SchemaNotification(), {
    _id: 'n1',
    projectId: 'p1',
    recipientUserId: 'u1',
    title: 'Done',
  })
  expectValidAndStrict(behaviour)
  expect(behaviour).toMatchSnapshot()
})
