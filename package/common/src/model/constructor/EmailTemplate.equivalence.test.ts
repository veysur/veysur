jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { SchemaEmailTemplate } from './EmailTemplate.schema'
import { EmailTemplate } from './EmailTemplate'

it('EmailTemplate behaves as recorded', () => {
  expect(
    constructorBehaviour(
      EmailTemplate,
      new SchemaEmailTemplate().builderFields(),
    ),
  ).toMatchSnapshot()
})
