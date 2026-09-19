import { DatabasePatchInterface } from 'mzen-migrate'
import { ModelManager, DataSourceContext } from 'mzen-om'

export default class InitProjectParticipantSnapshotTables implements DatabasePatchInterface {
  version = '2026-08-18_1050'
  description =
    'Create surveyParticipantAttributeSnapshot and surveyParticipantAttributeLanguageSnapshot tables'
  dataSourceName = 'project'

  async update(
    modelManager: ModelManager,
    context: DataSourceContext,
  ): Promise<void> {
    console.log('\nCreating participant attribute snapshot tables...')

    console.log(
      '  Creating surveyParticipantAttributeSnapshot table and indexes...',
    )
    await modelManager
      .getRepo('surveyParticipantAttributeSnapshot')
      .createIndexes(context)
    console.log('  ✓ surveyParticipantAttributeSnapshot ready')

    console.log(
      '  Creating surveyParticipantAttributeLanguageSnapshot table and indexes...',
    )
    await modelManager
      .getRepo('surveyParticipantAttributeLanguageSnapshot')
      .createIndexes(context)
    console.log('  ✓ surveyParticipantAttributeLanguageSnapshot ready')

    console.log('✓ Participant attribute snapshot tables created\n')
  }
}
