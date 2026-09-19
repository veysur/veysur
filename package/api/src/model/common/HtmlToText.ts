import { convert, HtmlToTextOptions } from 'html-to-text'

export class HtmlToText {
  /**
   * Convert HTML to plain text for email clients
   * Optimized for email template conversion with readable link formatting
   */
  static convert(html: string): string {
    if (!html || html.trim() === '') {
      return ''
    }

    const options: HtmlToTextOptions = {
      // Link formatting: "Text (URL)" for better readability
      selectors: [
        {
          selector: 'a',
          options: {
            // Format: "Text (URL)" - readable and includes both
            // Example: "Start Survey (https://example.com/survey/123)"
            linkBrackets: ['(', ')'],
          },
        },
        {
          selector: 'h1',
          options: {
            uppercase: false,
          },
        },
        {
          selector: 'h2',
          options: {
            uppercase: false,
          },
        },
        {
          selector: 'img',
          format: 'skip', // Skip images in text version
        },
      ],
      // Preserve paragraph spacing for readability
      wordwrap: 80,
      // Preserve line breaks
      preserveNewlines: true,
      // Remove excessive whitespace
      trimEmptyLines: true,
    }

    try {
      return convert(html, options)
    } catch (error) {
      // Log error but return empty string to prevent email send failure
      console.error('Failed to convert HTML to text:', error)
      return ''
    }
  }
}

export default HtmlToText
