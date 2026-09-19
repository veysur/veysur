import { Card, CardHeader, CardContent, CardTitle } from 'component/shadcn/card'

import { DefaultableButtonSwitch } from './DefaultableButtonSwitch'
import { SettingsDataAdapter, SettingsHandlers } from './SettingSurveyAdapter'

type Props<T> = {
  data: SettingsDataAdapter<T>
  handlers: SettingsHandlers & { YES: string; NO: string }
  layout?: {
    wrapInForm?: boolean
    wrapInRow?: boolean
    cardClassName?: string
    showCard?: boolean
  }
}

export function BaseContentSettings<T>({ data, handlers, layout }: Props<T>) {
  const hasDefaults = !!data.getDefault

  const {
    wrapInForm = true,
    wrapInRow = true,
    cardClassName = 'mb-4',
    showCard = true,
  } = layout || {}

  const htmlAllowed = data.contentFormat?.htmlAllowed
  const markdownAllowed = data.contentFormat?.markdownAllowed
  const effectiveHtml =
    htmlAllowed ??
    (data.getDefault?.('contentFormat', 'htmlAllowed') as boolean)
  const effectiveMarkdown =
    markdownAllowed ??
    (data.getDefault?.('contentFormat', 'markdownAllowed') as boolean)
  const willRenderAsPlainText = !effectiveHtml && !effectiveMarkdown

  const switches = (
    <>
      <DefaultableButtonSwitch
        label="Markdown"
        value={data.contentFormat?.markdownAllowed}
        onChange={(value) =>
          handlers.handleBooleanChange?.(
            'contentFormat',
            'markdownAllowed',
            value,
          )
        }
        options={[
          { value: handlers.YES, label: handlers.YES },
          { value: handlers.NO, label: handlers.NO },
        ]}
        hasDefaults={hasDefaults}
        defaultValue={data.getDefault?.('contentFormat', 'markdownAllowed')}
        helpText="Allow markdown formatting (bold, links, lists) in question text, group descriptions, welcome/thank-you messages, and legal/data policy text."
        className="mb-3"
      />

      <DefaultableButtonSwitch
        label="Raw HTML"
        value={data.contentFormat?.htmlAllowed}
        onChange={(value) =>
          handlers.handleBooleanChange?.('contentFormat', 'htmlAllowed', value)
        }
        options={[
          { value: handlers.YES, label: handlers.YES },
          { value: handlers.NO, label: handlers.NO },
        ]}
        hasDefaults={hasDefaults}
        defaultValue={data.getDefault?.('contentFormat', 'htmlAllowed')}
        helpText="Allow raw HTML authoring. Only used when Markdown is off - Markdown takes precedence when both are enabled."
        className="mb-3"
      />

      {willRenderAsPlainText && (
        <p className="text-sm text-muted-foreground mb-3">
          Markdown and Raw HTML are both off - content will render as plain text
          with no formatting.
        </p>
      )}

      <DefaultableButtonSwitch
        label="Allow <script> Tags"
        value={data.contentFormat?.scriptTagsAllowed}
        onChange={(value) =>
          handlers.handleBooleanChange?.(
            'contentFormat',
            'scriptTagsAllowed',
            value,
          )
        }
        options={[
          { value: handlers.YES, label: handlers.YES },
          { value: handlers.NO, label: handlers.NO },
        ]}
        hasDefaults={hasDefaults}
        defaultValue={data.getDefault?.('contentFormat', 'scriptTagsAllowed')}
        helpText="Dangerous - allows arbitrary JavaScript to run for anyone viewing this survey. Only enable this if you fully trust every editor of this survey's content."
        className="mb-0 rounded-md border border-destructive/50 bg-destructive/5 p-3"
      />
    </>
  )

  const cardContent = showCard ? (
    <Card className={cardClassName}>
      <CardHeader>
        <CardTitle>Content Format</CardTitle>
      </CardHeader>
      <CardContent className="h-full overflow-y-auto">{switches}</CardContent>
    </Card>
  ) : (
    <div>{switches}</div>
  )

  const content = wrapInRow ? (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {cardContent}
    </div>
  ) : (
    cardContent
  )

  return wrapInForm ? <form>{content}</form> : content
}
