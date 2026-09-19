/**
 * Copy text to clipboard with fallback for non-secure contexts
 * @param text - The text to copy to clipboard
 * @returns Promise that resolves to true on success, false on failure
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      // Fallback for non-secure contexts (localhost)
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
    return true
  } catch (err) {
    console.error('Failed to copy:', err)
    return false
  }
}
