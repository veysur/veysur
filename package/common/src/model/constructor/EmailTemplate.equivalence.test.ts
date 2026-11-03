jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { emailTemplateSpec } from '../schema/SchemaEmailTemplate'
import { EmailTemplate } from './EmailTemplate'

it('EmailTemplate behaves as recorded', () => {
  expect(
    constructorBehaviour(EmailTemplate, emailTemplateSpec),
  ).toMatchSnapshot()
})
