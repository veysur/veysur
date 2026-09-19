import { useEffect } from 'react'

export interface UsePageTitleOptions {
  prefix?: string
  suffix?: string
}

/**
 * Hook to dynamically set the document title
 * @param title - The main title text
 * @param options - Optional prefix and suffix for the title
 *
 * @example
 * // Simple usage
 * usePageTitle('Surveys')
 *
 * @example
 * // With suffix
 * usePageTitle('Surveys', { suffix: 'Veysur Admin' })
 *
 * @example
 * // Dynamic title
 * const survey = useSurveyEditorStore(state => state.survey)
 * usePageTitle(survey?.name || 'Loading...', { suffix: 'Veysur Admin' })
 */
export function usePageTitle(
  title: string,
  options: UsePageTitleOptions = {},
): void {
  useEffect(() => {
    const parts = [options.prefix, title, options.suffix].filter(Boolean)
    const fullTitle = parts.join(' | ')

    document.title = fullTitle
  }, [title, options.prefix, options.suffix])
}
