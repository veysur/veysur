/**
 * Escapes special regex characters in a string to make it safe for use in regex patterns.
 * This prevents regex syntax errors when user input contains special characters like [, ], (, ), *, +, etc.
 *
 * @param str - The string to escape
 * @returns The escaped string safe for use in regex
 */
export function escapeRegex(str: string): string {
  // Escape all special regex characters: \ ^ $ . | ? * + ( ) [ ] { }
  return str.replace(/[\\^$.|?*+()[\]{}]/g, '\\$&')
}
