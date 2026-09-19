/**
 * Triggers a file download using fetch to support custom headers (like Authorization)
 * Downloads blob and creates object URL for download
 */
export async function downloadFile(
  url: string,
  headers?: Record<string, string>,
): Promise<void> {
  // Use fetch to get the file with proper headers
  const response = await fetch(url, {
    method: 'GET',
    headers: headers || {},
  })

  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`)
  }

  // Get the blob from response
  const blob = await response.blob()

  // Extract filename from Content-Disposition header if available
  const contentDisposition = response.headers.get('Content-Disposition')
  let filename = 'download.csv'
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="([^"]+)"/i)
    if (filenameMatch) {
      filename = filenameMatch[1]
    }
  }

  // Create object URL and trigger download
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up object URL
  URL.revokeObjectURL(blobUrl)
}
