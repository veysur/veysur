import { Card, CardHeader, CardContent } from 'component/shadcn/card'

import { useFeatureGate } from 'appAdmin/hook'
import { DefaultableValueInput } from './DefaultableValueInput'
import { DefaultableButtonSwitch } from './DefaultableButtonSwitch'
import { SettingsDataAdapter, SettingsHandlers } from './SettingSurveyAdapter'

type Props<T> = {
  data: SettingsDataAdapter<T>
  handlers: SettingsHandlers & { YES: string; NO: string }
}

export function BasePresentationSettings<T>({ data, handlers }: Props<T>) {
  const hasDefaults = !!data.getDefault
  const { canUse } = useFeatureGate()
  const canNoBrand = canUse('NOBRAND')

  return (
    <form>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center gap-2">
              <span>📋</span>
              <span className="mb-0 font-semibold">Display Format</span>
            </div>
          </CardHeader>
          <CardContent>
            <DefaultableButtonSwitch
              label="Format"
              value={data.presentation?.format}
              onChange={(value) =>
                handlers.handleStringChange?.('presentation', 'format', value)
              }
              options={[
                { value: 'group', label: 'Group' },
                { value: 'question', label: 'Question' },
                { value: 'all', label: 'All' },
              ]}
              hasDefaults={hasDefaults}
              defaultValue={data.getDefault?.('presentation', 'format')}
              helpText="How survey content is displayed: by group, individual questions, or all at once."
              className="mb-3"
            />

            <DefaultableButtonSwitch
              label="No Answer"
              value={data.presentation?.noAnswer}
              onChange={(value) =>
                handlers.handleBooleanChange?.(
                  'presentation',
                  'noAnswer',
                  value,
                )
              }
              options={[
                { value: handlers.YES, label: handlers.YES },
                { value: handlers.NO, label: handlers.NO },
              ]}
              hasDefaults={hasDefaults}
              defaultValue={data.getDefault?.('presentation', 'noAnswer')}
              helpText="Show no-answer option for non-mandatory questions."
              className="mb-3"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-info/10 border-b border-info/25">
            <div className="flex items-center gap-2">
              <span>❓</span>
              <span className="mb-0 font-semibold">Question Display</span>
            </div>
          </CardHeader>
          <CardContent>
            <DefaultableButtonSwitch
              label="Group Name"
              value={data.presentation?.groupName}
              onChange={(value) =>
                handlers.handleBooleanChange?.(
                  'presentation',
                  'groupName',
                  value,
                )
              }
              options={[
                { value: handlers.YES, label: handlers.YES },
                { value: handlers.NO, label: handlers.NO },
              ]}
              hasDefaults={hasDefaults}
              defaultValue={data.getDefault?.('presentation', 'groupName')}
              className="mb-3"
            />

            <DefaultableButtonSwitch
              label="Group Description"
              value={data.presentation?.groupDesc}
              onChange={(value) =>
                handlers.handleBooleanChange?.(
                  'presentation',
                  'groupDesc',
                  value,
                )
              }
              options={[
                { value: handlers.YES, label: handlers.YES },
                { value: handlers.NO, label: handlers.NO },
              ]}
              hasDefaults={hasDefaults}
              defaultValue={data.getDefault?.('presentation', 'groupDesc')}
              className="mb-3"
            />

            <DefaultableButtonSwitch
              label="Question Number"
              value={data.presentation?.questionNum}
              onChange={(value) =>
                handlers.handleBooleanChange?.(
                  'presentation',
                  'questionNum',
                  value,
                )
              }
              options={[
                { value: handlers.YES, label: handlers.YES },
                { value: handlers.NO, label: handlers.NO },
              ]}
              hasDefaults={hasDefaults}
              defaultValue={data.getDefault?.('presentation', 'questionNum')}
              className="mb-3"
            />

            <DefaultableButtonSwitch
              label="Question Code"
              value={data.presentation?.questionCode}
              onChange={(value) =>
                handlers.handleBooleanChange?.(
                  'presentation',
                  'questionCode',
                  value,
                )
              }
              options={[
                { value: handlers.YES, label: handlers.YES },
                { value: handlers.NO, label: handlers.NO },
              ]}
              hasDefaults={hasDefaults}
              defaultValue={data.getDefault?.('presentation', 'questionCode')}
              className="mb-3"
            />

            <DefaultableButtonSwitch
              label="Question Index"
              value={data.presentation?.questionIndex}
              onChange={(value) =>
                handlers.handleBooleanChange?.(
                  'presentation',
                  'questionIndex',
                  value,
                )
              }
              options={[
                { value: handlers.YES, label: handlers.YES },
                { value: handlers.NO, label: handlers.NO },
              ]}
              hasDefaults={hasDefaults}
              defaultValue={data.getDefault?.('presentation', 'questionIndex')}
              className="mb-0"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span>🎨</span>
              <span className="mb-0 font-semibold">UI Elements</span>
            </div>
          </CardHeader>
          <CardContent>
            <DefaultableButtonSwitch
              label="Title"
              value={data.presentation?.title}
              onChange={(value) =>
                handlers.handleBooleanChange?.('presentation', 'title', value)
              }
              options={[
                { value: handlers.YES, label: handlers.YES },
                { value: handlers.NO, label: handlers.NO },
              ]}
              hasDefaults={hasDefaults}
              defaultValue={data.getDefault?.('presentation', 'title')}
              helpText="Display survey title at the top of the survey."
              className="mb-3"
            />

            <DefaultableButtonSwitch
              label="Welcome Message"
              value={data.presentation?.welcomeMessage}
              onChange={(value) =>
                handlers.handleBooleanChange?.(
                  'presentation',
                  'welcomeMessage',
                  value,
                )
              }
              options={[
                { value: handlers.YES, label: handlers.YES },
                { value: handlers.NO, label: handlers.NO },
              ]}
              hasDefaults={hasDefaults}
              defaultValue={data.getDefault?.('presentation', 'welcomeMessage')}
              helpText="Display welcome message at the start of the survey."
              className="mb-3"
            />

            <DefaultableButtonSwitch
              label="Progress Bar"
              value={data.presentation?.progressBar}
              onChange={(value) =>
                handlers.handleBooleanChange?.(
                  'presentation',
                  'progressBar',
                  value,
                )
              }
              options={[
                { value: handlers.YES, label: handlers.YES },
                { value: handlers.NO, label: handlers.NO },
              ]}
              hasDefaults={hasDefaults}
              defaultValue={data.getDefault?.('presentation', 'progressBar')}
              helpText="Show progress bar indicating survey completion status."
              className="mb-3"
            />

            <DefaultableButtonSwitch
              label="Question Count"
              value={data.presentation?.questionCount}
              onChange={(value) =>
                handlers.handleBooleanChange?.(
                  'presentation',
                  'questionCount',
                  value,
                )
              }
              options={[
                { value: handlers.YES, label: handlers.YES },
                { value: handlers.NO, label: handlers.NO },
              ]}
              hasDefaults={hasDefaults}
              defaultValue={data.getDefault?.('presentation', 'questionCount')}
              helpText="Display total number of questions to participants."
              className="mb-3"
            />

            <DefaultableButtonSwitch
              label="Remove Branding"
              value={data.presentation?.noBrand}
              onChange={(value) =>
                handlers.handleBooleanChange?.('presentation', 'noBrand', value)
              }
              options={[
                { value: handlers.YES, label: handlers.YES },
                { value: handlers.NO, label: handlers.NO },
              ]}
              hasDefaults={hasDefaults}
              defaultValue={data.getDefault?.('presentation', 'noBrand')}
              helpText={
                canNoBrand
                  ? 'Hide the Veysur branding from the survey UI.'
                  : 'Unbranded surveys is available on Business plan. Upgrade to enable.'
              }
              disabled={!canNoBrand}
              className="mb-0"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span>🧭</span>
              <span className="mb-0 font-semibold">Navigation & Actions</span>
            </div>
          </CardHeader>
          <CardContent>
            <DefaultableButtonSwitch
              label="Back Navigation"
              value={data.presentation?.backNav}
              onChange={(value) =>
                handlers.handleBooleanChange?.('presentation', 'backNav', value)
              }
              options={[
                { value: handlers.YES, label: handlers.YES },
                { value: handlers.NO, label: handlers.NO },
              ]}
              hasDefaults={hasDefaults}
              defaultValue={data.getDefault?.('presentation', 'backNav')}
              helpText="Allow users to navigate backwards and change their answers."
              className="mb-3"
            />

            <DefaultableValueInput
              label="Navigation Delay"
              type="number"
              currentValue={data.presentation?.navDelay}
              defaultValue={data.getDefault?.('presentation', 'navDelay') || 0}
              section="presentation"
              field="navDelay"
              handler={handlers.handleNumberChange!}
              hasDefaults={hasDefaults}
              min={0}
              helpText="Seconds before navigation links/buttons become active (0 = immediate)."
              className="mb-3"
            />

            <DefaultableButtonSwitch
              label="Redirect End"
              value={data.presentation?.redirectEnd}
              onChange={(value) =>
                handlers.handleBooleanChange?.(
                  'presentation',
                  'redirectEnd',
                  value,
                )
              }
              options={[
                { value: handlers.YES, label: handlers.YES },
                { value: handlers.NO, label: handlers.NO },
              ]}
              hasDefaults={hasDefaults}
              defaultValue={data.getDefault?.('presentation', 'redirectEnd')}
              helpText="End URL becomes redirect URL at survey completion."
              className="mb-3"
            />

            <DefaultableButtonSwitch
              label="End URL Link"
              value={data.presentation?.thankYouLink}
              onChange={(value) =>
                handlers.handleBooleanChange?.(
                  'presentation',
                  'thankYouLink',
                  value,
                )
              }
              options={[
                { value: handlers.YES, label: handlers.YES },
                { value: handlers.NO, label: handlers.NO },
              ]}
              hasDefaults={hasDefaults}
              defaultValue={data.getDefault?.('presentation', 'thankYouLink')}
              helpText="Show the End URL link on the thank you page, for every language."
              className="mb-3"
            />

            <DefaultableButtonSwitch
              label="Print"
              value={data.presentation?.print}
              onChange={(value) =>
                handlers.handleBooleanChange?.('presentation', 'print', value)
              }
              options={[
                { value: handlers.YES, label: handlers.YES },
                { value: handlers.NO, label: handlers.NO },
              ]}
              hasDefaults={hasDefaults}
              defaultValue={data.getDefault?.('presentation', 'print')}
              helpText="Allow participants to print their answers at the end of the survey."
              className="mb-3"
            />

            {/* Stats: hidden until participant-facing end-of-survey stats display is implemented — see docs/pending-features.md */}
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
