/**
 * ProjectSubscription Constructor
 * Represents a project's subscription assignment with billing details
 */
export class ProjectSubscription {
  _id: string
  projectId: string
  createdById: string
  subscriptionCode: string
  subscriptionName: string
  startedAt: Date
  endedAt: Date | null // null = active subscription
  payment: {
    period: 'month' | 'year'
    priceStd: number // Standard price (cents)
    price: number // Actual price (cents)
    dueNextAt: Date | null
    day: number // 1-28
    reminderSentAt: Date | null // when a renewal reminder email was last sent for the current dueNextAt cycle
  }
  feature: {
    [featureCode: string]: {
      available: boolean
      unlimited: boolean
      limit: number | null
      range: { min: number | null; max: number | null } | null
    }
  }
  createdAt: Date
  updatedAt: Date
  resourceLimitWarningSentAt?: Date | null // Set once the over-limit warning has been sent for the current downgrade reduction period; reset to null if usage drops back within limits
  responsesStartedThisPeriod: number // Aggregate count of responses first-answered in the current billing period; never decremented by response deletion
  responsesStartedPeriodStartMs: number | null // Epoch ms of the billing window start responsesStartedThisPeriod currently reflects; a mismatch against the current window means the counter is stale and reads as 0
  queuedOnDelete: boolean // True only for a future-dated FREE row created by ServiceProject.softDeleteProject's queueFreeOnDeletion - never set by user-initiated scheduleChange

  constructor(data: Partial<ProjectSubscription> = {}) {
    this._id = data._id || ''
    this.projectId = data.projectId || ''
    this.createdById = data.createdById || ''
    this.subscriptionCode = data.subscriptionCode || ''
    this.subscriptionName = data.subscriptionName || ''
    this.startedAt = data.startedAt || new Date()
    this.endedAt = data.endedAt || null
    this.payment = data.payment || {
      period: 'month',
      priceStd: 0,
      price: 0,
      dueNextAt: null,
      day: 1,
      reminderSentAt: null,
    }
    this.feature = data.feature || {}
    this.createdAt = data.createdAt || new Date()
    this.updatedAt = data.updatedAt || new Date()
    this.resourceLimitWarningSentAt = data.resourceLimitWarningSentAt || null
    this.responsesStartedThisPeriod = data.responsesStartedThisPeriod ?? 0
    this.responsesStartedPeriodStartMs =
      data.responsesStartedPeriodStartMs ?? null
  }
}
