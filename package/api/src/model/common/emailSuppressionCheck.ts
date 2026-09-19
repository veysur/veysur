import { EmailSuppression } from 'veysur-common'
import { RepoEmailSuppression } from 'model/repo'

export async function findLiveSuppression(
  repoEmailSuppression: RepoEmailSuppression,
  email: string,
): Promise<EmailSuppression | null> {
  return repoEmailSuppression.findOne({
    email,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  })
}

export const HARD_SUPPRESSION_REASONS = ['hardBounce', 'complaint'] as const
