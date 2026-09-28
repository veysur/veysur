import React from 'react'
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react'
import { MergeResult } from 'veysur-common'

import { Card, CardContent, CardHeader, CardTitle } from 'component/shadcn/card'
import { Button } from 'component/shadcn/button'
import { Alert, AlertDescription, AlertTitle } from 'component/shadcn/alert'
import { MergeStatistics } from './MergeStatistics'

type Props = {
  mergeResult: MergeResult
}

export const MergePreview: React.FC<Props> = ({ mergeResult }) => {
  const [expandedSamples, setExpandedSamples] = React.useState<Set<number>>(
    new Set(),
  )

  const toggleSample = (index: number) => {
    const newExpanded = new Set(expandedSamples)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedSamples(newExpanded)
  }

  return (
    <div className="space-y-6">
      {/* Deduplication Info */}
      {mergeResult.stats.responsesAlreadyMerged > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Duplicate Prevention Active</AlertTitle>
          <AlertDescription>
            {mergeResult.stats.responsesAlreadyMerged} response
            {mergeResult.stats.responsesAlreadyMerged !== 1
              ? 's are'
              : ' is'}{' '}
            already present in the target snapshot and will be skipped to
            prevent duplicates.
            {mergeResult.stats.responsesCreated === 0 && (
              <span className="font-semibold">
                {' '}
                All responses have already been merged.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {mergeResult.stats.responsesSkippedParticipantDuplicate > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Duplicate Prevention Active</AlertTitle>
          <AlertDescription>
            {mergeResult.stats.responsesSkippedParticipantDuplicate} response
            {mergeResult.stats.responsesSkippedParticipantDuplicate !== 1
              ? 's are'
              : ' is'}{' '}
            skipped because the participant already has a response in the target
            snapshot.
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Merge Statistics</h3>
        <MergeStatistics stats={mergeResult.stats} />
      </div>

      {/* Sample Mappings */}
      {mergeResult.preview && mergeResult.preview.sampleMappings.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">
            Sample Response Mappings
          </h3>
          <div className="space-y-3">
            {mergeResult.preview.sampleMappings.map((mapping, index) => {
              const isExpanded = expandedSamples.has(index)
              const mappedCount = Object.keys(mapping.mappedAnswers).length
              const skippedCount = mapping.skippedAnswers.length
              const originalCount = Object.keys(mapping.originalAnswers).length

              return (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        Response {index + 1}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSample(index)}
                        className="h-8"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-success" />
                        {mappedCount} transferred
                      </span>
                      {skippedCount > 0 && (
                        <span className="flex items-center gap-1">
                          <XCircle className="h-3 w-3 text-warning" />
                          {skippedCount} skipped
                        </span>
                      )}
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {/* Original Answers */}
                        <div>
                          <h4 className="text-xs font-semibold mb-2 text-muted-foreground">
                            Original Answers ({originalCount})
                          </h4>
                          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                            {JSON.stringify(mapping.originalAnswers, null, 2)}
                          </pre>
                        </div>

                        {/* Mapped Answers */}
                        <div>
                          <h4 className="text-xs font-semibold mb-2 text-success">
                            Mapped Answers ({mappedCount})
                          </h4>
                          <pre className="text-xs bg-success/10 text-success p-3 rounded overflow-x-auto">
                            {JSON.stringify(mapping.mappedAnswers, null, 2)}
                          </pre>
                        </div>

                        {/* Skipped Answers */}
                        {skippedCount > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold mb-2 text-warning">
                              Skipped Answers ({skippedCount})
                            </h4>
                            <div className="space-y-2">
                              {mapping.skippedAnswers.map((skip, skipIndex) => (
                                <div
                                  key={skipIndex}
                                  className="text-xs bg-warning/10 text-warning p-2 rounded"
                                >
                                  <div className="font-semibold">
                                    {skip.questionCode}
                                  </div>
                                  <div className="text-muted-foreground">
                                    Reason: {formatSkipReason(skip.reason)}
                                  </div>
                                  <div className="text-muted-foreground mt-1">
                                    Value: {JSON.stringify(skip.originalValue)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function formatSkipReason(reason: string): string {
  switch (reason) {
    case 'missing_question':
      return 'Question not found in target'
    case 'incompatible_type':
      return 'Question type incompatible'
    case 'missing_option':
      return 'Answer option not found in target'
    case 'missing_subquestion':
      return 'Subquestion not found in target'
    default:
      return reason
  }
}
