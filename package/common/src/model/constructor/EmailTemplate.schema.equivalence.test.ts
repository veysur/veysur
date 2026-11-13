jest.useRealTimers()

import {
  expectValidAndStrict,
  schemaBehaviour,
} from '../../test-utils/schemaEquivalence'
import { SchemaEmailTemplate } from './EmailTemplate.schema'

it('SchemaEmailTemplate validates as recorded and rejects unknown keys', async () => {
  const behaviour = await schemaBehaviour(new SchemaEmailTemplate(), {
    _id: 'id1',
    surveyId: null,
    type: 'invite',
    lang: 'en',
    subject: 'Hello',
    body: 'Body',
  })
  expectValidAndStrict(behaviour)
  expect(behaviour).toMatchSnapshot()
})
