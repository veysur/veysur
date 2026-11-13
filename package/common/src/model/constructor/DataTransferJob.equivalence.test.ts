jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { SchemaDataTransferJob } from './DataTransferJob.schema'
import { DataTransferJob } from './DataTransferJob'

it('DataTransferJob behaves as recorded', () => {
  expect(
    constructorBehaviour(
      DataTransferJob,
      new SchemaDataTransferJob().builderFields(),
    ),
  ).toMatchSnapshot()
})
