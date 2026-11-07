type Load<T> = () => Promise<T | null | undefined>

/** Stands in for ServiceSurveyParticipantCache in tests that exercise the loaders, not the cache. */
export function passthroughParticipantCache() {
  return {
    getLive: jest.fn(
      <T>(_projectId: string, _surveyId: string, load: Load<T>) => load(),
    ),
    getView: jest.fn(
      <T>(_p: string, _s: string, _l: string | null, load: Load<T>) => load(),
    ),
    getBotProtection: jest.fn(<T>(_projectId: string, load: Load<T>) => load()),
    invalidateSurvey: jest.fn(),
    invalidateProject: jest.fn(),
  }
}
