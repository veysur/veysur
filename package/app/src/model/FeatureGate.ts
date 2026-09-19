export interface FeatureGateStatus {
  available: boolean
  unlimited: boolean
  limit: number | null
  used?: number
}

export type FeatureGateMap = Record<string, FeatureGateStatus | undefined>

export interface FeatureGateProvider {
  getGates(projectId: string): Promise<FeatureGateMap>
}
