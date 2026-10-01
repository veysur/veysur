import React from 'react'

interface BuildInfo {
  version: string
  coreSha: string
  cloudSha: string
}

// Self-hosted shows the package version and the veysur SHA. Cloud shows
// only the two SHAs, labelled so the deployed cloud commit and the core
// commit it embeds can be told apart.
export function formatBuildInfo({
  version,
  coreSha,
  cloudSha,
}: BuildInfo): string {
  return cloudSha
    ? `core ${coreSha} · cloud ${cloudSha}`
    : `v${version} · ${coreSha}`
}

export const AppVersion: React.FC<{ className?: string }> = ({ className }) => (
  <span className={className} data-testid="app-version">
    {formatBuildInfo({
      version: process.env.PUBLIC_APP_VERSION || '',
      coreSha: process.env.PUBLIC_CORE_SHA || 'dev',
      cloudSha: process.env.PUBLIC_CLOUD_SHA || '',
    })}
  </span>
)
