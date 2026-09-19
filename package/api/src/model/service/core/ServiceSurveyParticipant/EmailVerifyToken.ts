import { StringRandom } from 'veysur-common'
import { DataSourceContext } from 'mzen-om'
import { RepoSurveyParticipant } from 'model/repo'

/**
 * emailVerifyToken proves a survey link was opened via the actual invite/
 * reminder email, as opposed to participant.token which is intentionally
 * shareable/reusable. Compared only against a single participant record, so
 * unlike ParticipantToken it needs no per-survey uniqueness check.
 */
export class EmailVerifyToken {
  private static readonly LENGTH = 6

  static generate(): string {
    return StringRandom.genAlphaNumericUpper(this.LENGTH)
  }

  /** Backfills a missing emailVerifyToken on an existing participant record and persists it. */
  static async ensureFor(
    participant: { _id: unknown; emailVerifyToken?: string },
    repoSurveyParticipant: RepoSurveyParticipant,
    context: DataSourceContext,
  ): Promise<string> {
    if (!participant.emailVerifyToken) {
      participant.emailVerifyToken = this.generate()
      await repoSurveyParticipant.updateOne(
        { _id: participant._id },
        { $set: { emailVerifyToken: participant.emailVerifyToken } },
        { context },
      )
    }
    return participant.emailVerifyToken
  }

  static buildSurveyLink({
    surveyDomain,
    surveyId,
    token,
    emailVerifyToken,
    language,
  }: {
    surveyDomain: string
    surveyId: string
    token: string
    emailVerifyToken: string
    language?: string | null
  }): string {
    const langParam = language ? `&lang=${encodeURIComponent(language)}` : ''
    return `https://${surveyDomain}/survey/${surveyId}/${token}?evt=${emailVerifyToken}${langParam}`
  }
}

export default EmailVerifyToken
