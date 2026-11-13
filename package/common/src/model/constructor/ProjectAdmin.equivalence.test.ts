import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { SchemaProjectAdmin } from './ProjectAdmin.schema'
import { ProjectAdmin } from './ProjectAdmin'

it('ProjectAdmin behaves as recorded', () => {
  expect(
    constructorBehaviour(
      ProjectAdmin,
      new SchemaProjectAdmin().builderFields(),
    ),
  ).toMatchSnapshot()
})
