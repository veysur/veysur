// cspell:ignore unindexed
import { DatabasePatchInterface } from '@datacapy/migrate'
import { ModelManager, DataSourceContext } from '@datacapy/om'

export default class InitProjectSurveyResponseIndexes implements DatabasePatchInterface {
  version = '2026-08-18_1100'
  description =
    'Create indexes for surveyResponse, including completedAt for completion-time queries'
  dataSourceName = 'project'

  async update(
    modelManager: ModelManager,
    context: DataSourceContext,
  ): Promise<void> {
    try {
      await modelManager.getRepo('surveyResponse').createIndexes(context)
      console.log('✓ Indexes created for surveyResponse')
    } catch (error) {
      if (error.message?.includes('already exists')) {
        console.log('⚠ Some indexes for surveyResponse already exist')
      } else {
        throw error
      }
    }
  }
}
