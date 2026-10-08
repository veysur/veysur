import React from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { SettingSurvey, Survey } from 'veysur-common'

import { copyToClipboard } from 'common/copyToClipboard'
import { Button } from 'component/shadcn/button'
import { Card, CardContent, CardHeader, CardTitle } from 'component/shadcn/card'
import { Label } from 'component/shadcn/label'
import { Switch } from 'component/shadcn/switch'
import { Textarea } from 'component/shadcn/textarea'

import {
  EMBED_BLOCKER_MESSAGES,
  buildEmbedPreviewUrl,
  buildEmbedSnippet,
  getEmbedBlockers,
} from './embedSnippet'

type Props = {
  survey: Survey
  settingSurvey: SettingSurvey
  projectId: string
  // Only set when the survey has several languages
  language?: string
  isPublished: boolean
  onEmbedChange: (embed: boolean) => void
}

export const SurveyEmbedCard: React.FC<Props> = ({
  survey,
  settingSurvey,
  projectId,
  language,
  isPublished,
  onEmbedChange,
}) => {
  const [copied, setCopied] = React.useState(false)
  const access = survey.getAccess(settingSurvey)
  const blockers = getEmbedBlockers(access, survey)
  const canEmbed = blockers.length === 0
  // Stored as null when empty
  const embedDomains = access.embedDomains ?? []

  const target = {
    origin: window.location.origin,
    projectId,
    surveyId: survey._id,
    language,
  }
  const snippet = buildEmbedSnippet(target)

  const handleCopy = async () => {
    if (await copyToClipboard(snippet)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Embed in a Website</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch
            id="survey-embed-enabled"
            checked={access.embed}
            disabled={!canEmbed && !access.embed}
            onCheckedChange={onEmbedChange}
          />
          <Label htmlFor="survey-embed-enabled">
            Allow this survey to be embedded
          </Label>
        </div>

        {blockers.length > 0 && (
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            {blockers.map((blocker) => (
              <li key={blocker}>{EMBED_BLOCKER_MESSAGES[blocker]}</li>
            ))}
          </ul>
        )}

        {access.embed && canEmbed && (
          <>
            <div className="space-y-2">
              <Label>Code to paste into your page</Label>
              <div className="flex gap-2">
                <Textarea
                  value={snippet}
                  readOnly
                  rows={3}
                  className="flex-1 font-mono text-xs"
                />
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    disabled={!isPublished}
                    tooltip={
                      isPublished
                        ? copied
                          ? 'Copied!'
                          : 'Copy code'
                        : 'Publish the survey to copy this code'
                    }
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    onClick={() =>
                      window.open(buildEmbedPreviewUrl(target), '_blank')
                    }
                    variant="outline"
                    disabled={!isPublished}
                    tooltip={
                      isPublished
                        ? 'Open the embedded view'
                        : 'Publish the survey to open the embedded view'
                    }
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Allowed websites</Label>
              <p className="text-sm">
                {embedDomains.length > 0 && !embedDomains.includes('*')
                  ? embedDomains.join(', ')
                  : 'Any website'}
              </p>
              <Link
                to={`/survey/${survey._id}/setting/access`}
                className="text-sm underline"
              >
                Change in Access Control settings
              </Link>
            </div>
          </>
        )}

        <p className="text-sm text-muted-foreground">
          Changes to embedding apply when the survey is published again.
        </p>
      </CardContent>
    </Card>
  )
}
