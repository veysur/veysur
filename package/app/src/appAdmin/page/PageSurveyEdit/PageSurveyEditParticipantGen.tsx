import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TestTube, AlertCircle } from 'lucide-react'

import {
  SurveyEditorNavContainer,
  SurveyPageContent,
  useSurveyEditorStore,
} from 'appAdmin/component/SurveyEditor'
import { usePageTitle } from 'hook'
import { useFlashMessage } from 'component/FlashMessage'
import { useSurveyParticipantGenerate } from 'appAdmin/component/SurveyParticipant/hook'
import { Button } from 'component/shadcn/button'
import { Input } from 'component/shadcn/input'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Label } from 'component/shadcn/label'
import { Card, CardContent, CardHeader, CardTitle } from 'component/shadcn/card'

type GenerateState = 'idle' | 'generating' | 'error'

export const PageSurveyEditParticipantGen: React.FC = () => {
  const navigate = useNavigate()
  const survey = useSurveyEditorStore((state) => state.survey)
  const { setFlashMessage } = useFlashMessage()
  const { generateParticipants, isLoading } = useSurveyParticipantGenerate(
    survey?._id || '',
  )

  const [count, setCount] = useState<string>('3')
  const [generateState, setGenerateState] = useState<GenerateState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  usePageTitle(`Generate Test Participants - ${survey?.name || 'Loading...'}`, {
    suffix: 'Veysur Admin',
  })

  const handleBack = () => {
    navigate(`/survey/${survey?._id}/participant`)
  }

  const handleGenerate = async () => {
    const countNum = parseInt(count, 10)

    if (isNaN(countNum) || countNum < 1 || countNum > 1000) {
      setErrorMessage('Please enter a number between 1 and 1000')
      setGenerateState('error')
      return
    }

    setGenerateState('generating')
    setErrorMessage(null)

    try {
      const result = await generateParticipants(countNum)
      setFlashMessage(
        'success',
        `Successfully generated ${result.generatedCount} test participant${result.generatedCount !== 1 ? 's' : ''}`,
      )
      navigate(`/survey/${survey?._id}/participant`)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to generate participants',
      )
      setGenerateState('error')
    }
  }

  const handleReset = () => {
    setCount('3')
    setGenerateState('idle')
    setErrorMessage(null)
  }

  return (
    <SurveyEditorNavContainer surveyName={survey?.name}>
      <SurveyPageContent
        backButtonUrl={`/survey/${survey?._id}/participant`}
        onBackClick={handleBack}
      >
        <Card className="mx-auto max-w-3xl">
          <CardHeader>
            <CardTitle>Generate Test Participants</CardTitle>
            <p className="text-muted-foreground text-sm mt-1">
              Generate test participants for development and testing purposes
            </p>
          </CardHeader>
          <CardContent>
            {generateState === 'idle' && (
              <div>
                <div className="mb-4">
                  <Label htmlFor="count">
                    Number of participants to generate
                  </Label>
                  <Input
                    id="count"
                    type="number"
                    min="1"
                    max="1000"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    className="mt-1"
                    placeholder="Enter a number between 1 and 1000"
                  />
                  <p className="text-muted-foreground text-xs mt-1">
                    Maximum: 1000 participants
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleGenerate} disabled={isLoading}>
                    <TestTube className="h-4 w-4 mr-2" />
                    {isLoading ? 'Generating...' : 'Generate Participants'}
                  </Button>
                </div>
              </div>
            )}

            {generateState === 'generating' && (
              <div className="text-center py-12">
                <TestTube className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
                <h5 className="text-lg font-medium mb-2">
                  Generating Test Participants...
                </h5>
                <p className="text-muted-foreground text-sm">
                  Please wait while we create the participants
                </p>
              </div>
            )}

            {generateState === 'error' && errorMessage && (
              <div>
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle size={16} />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>

                <div className="flex justify-end">
                  <Button onClick={handleReset}>Try Again</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </SurveyPageContent>
    </SurveyEditorNavContainer>
  )
}

export default PageSurveyEditParticipantGen
