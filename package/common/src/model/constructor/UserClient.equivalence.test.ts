import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { SchemaUserClient } from './UserClient.schema'
import { UserClient } from './UserClient'

const { user: _relation, ...constructible } =
  new SchemaUserClient().builderFields()

it('UserClient behaves as recorded', () => {
  expect(constructorBehaviour(UserClient, constructible)).toMatchSnapshot()
})
