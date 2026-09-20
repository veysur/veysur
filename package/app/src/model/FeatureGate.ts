export interface FeatureGateStatus {
  available: boolean
  unlimited: boolean
  limit: number | null
  used?: number
  /** What is metered, for display, e.g. "Responses in the current period". */
  label?: string
}

export type FeatureGateMap = Record<string, FeatureGateStatus | undefined>

export interface FeatureGateProvider {
  getGates(projectId: string): Promise<FeatureGateMap>
}
