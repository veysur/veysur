jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { SchemaEmailSuppression } from './EmailSuppression.schema'
import { EmailSuppression } from './EmailSuppression'

it('EmailSuppression behaves as recorded', () => {
  expect(
    constructorBehaviour(
      EmailSuppression,
      new SchemaEmailSuppression().builderFields(),
    ),
  ).toMatchSnapshot()
})
