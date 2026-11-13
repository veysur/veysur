import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { SchemaProject } from './Project.schema'
import { Project } from './Project'

it('Project behaves as recorded', () => {
  expect(
    constructorBehaviour(Project, new SchemaProject().builderFields()),
  ).toMatchSnapshot()
})
