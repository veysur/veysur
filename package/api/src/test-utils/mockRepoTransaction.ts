interface MockTransactionLease {
  transactionCommit: () => Promise<unknown>
  transactionRollback: () => Promise<unknown>
}

/**
 * Builds a jest mock for `Repo#transaction()` that replicates the real commit/rollback/release
 * sequence against a mocked repo - use for repos passed to `repo.transaction(context, fn)` in
 * tests, alongside `getDataSource`/`releaseDataSource` mocks and a `transactionStart`-bearing
 * mock datasource.
 */
export function mockRepoTransaction(repo: {
  getDataSource: jest.Mock
  releaseDataSource: jest.Mock
}) {
  return jest.fn(
    async <R>(
      context: unknown,
      fn: (context: unknown, tx: unknown) => Promise<R>,
    ): Promise<R> => {
      const dataSource = await repo.getDataSource(context)
      try {
        const lease =
          (await dataSource.transactionStart()) as MockTransactionLease
        try {
          const result = await fn(context, lease)
          await lease.transactionCommit()
          return result
        } catch (error) {
          await lease.transactionRollback()
          throw error
        }
      } finally {
        repo.releaseDataSource(context)
      }
    },
  )
}
