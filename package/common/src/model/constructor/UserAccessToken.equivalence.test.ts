import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { SchemaUserAccessToken } from './UserAccessToken.schema'
import { UserAccessToken } from './UserAccessToken'

it('UserAccessToken behaves as recorded', () => {
  expect(
    constructorBehaviour(
      UserAccessToken,
      new SchemaUserAccessToken().builderFields(),
    ),
  ).toMatchSnapshot()
})
