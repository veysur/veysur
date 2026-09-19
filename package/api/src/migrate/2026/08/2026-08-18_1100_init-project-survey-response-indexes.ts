// cspell:ignore unindexed
import { DatabasePatchInterface } from 'mzen-migrate'
import { ModelManager, DataSourceContext } from 'mzen-om'

export default class InitProjectSurveyResponseIndexes implements DatabasePatchInterface {
  version = '2026-08-18_1100'
  description =
    'Create indexes for surveyResponse, including completedAt for billing-window usage counts'
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
