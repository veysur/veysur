/**
 * Image Processing Utilities
 *
 * Client-side image manipulation for answer option images.
 * Handles resizing, thumbnail generation, and validation.
 */

export const IMAGE_CONFIG = {
  MAX_ORIGINAL_DIMENSION: 1080,
  MAX_THUMBNAIL_DIMENSION: 540,
  JPEG_QUALITY: 1,
  ALLOWED_TYPES: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
}

/**
 * Validate image file type
 */
export function validateImageFile(file: File): string | null {
  if (!IMAGE_CONFIG.ALLOWED_TYPES.includes(file.type)) {
    return 'Please select an image file (PNG, JPEG, or WebP)'
  }

  if (file.size > IMAGE_CONFIG.MAX_FILE_SIZE) {
    return 'Image exceeds maximum file size (10MB)'
  }

  return null
}

/**
 * Load image from file or blob into HTMLImageElement
 */
async function loadImage(source: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(source)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

/**
 * Calculate dimensions maintaining aspect ratio
 */
function calculateDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height }
  }

  const aspectRatio = width / height

  if (width > height) {
    return {
      width: maxDimension,
      height: Math.round(maxDimension / aspectRatio),
    }
  } else {
    return {
      width: Math.round(maxDimension * aspectRatio),
      height: maxDimension,
    }
  }
}

/**
 * Convert canvas to blob
 */
async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to convert canvas to blob'))
        }
      },
      type,
      quality,
    )
  })
}

/**
 * Convert any image blob to JPEG format
 */
export async function convertBlobToJpeg(source: Blob): Promise<Blob> {
  const img = await loadImage(source)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  canvas.getContext('2d')!.drawImage(img, 0, 0)
  return canvasToBlob(canvas, 'image/jpeg', IMAGE_CONFIG.JPEG_QUALITY)
}

/**
 * Resize image to fit within max dimensions, maintaining aspect ratio
 */
export async function resizeImage(
  file: File,
  maxDimension: number,
): Promise<Blob> {
  const img = await loadImage(file)

  // Calculate new dimensions
  const { width, height } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    maxDimension,
  )

  // Create canvas and draw resized image
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  ctx.drawImage(img, 0, 0, width, height)

  // Convert to blob, preserving format if possible
  const mimeType = IMAGE_CONFIG.ALLOWED_TYPES.includes(file.type)
    ? file.type
    : 'image/jpeg'
  const quality =
    mimeType === 'image/jpeg' ? IMAGE_CONFIG.JPEG_QUALITY : undefined

  return canvasToBlob(canvas, mimeType, quality || 1)
}

/**
 * Generate thumbnail from image file or blob
 */
export async function generateThumbnail(
  source: File | Blob,
  maxDimension: number,
): Promise<Blob> {
  const img = await loadImage(source)

  // Calculate thumbnail dimensions
  const { width, height } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    maxDimension,
  )

  // Create canvas and draw thumbnail
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  ctx.drawImage(img, 0, 0, width, height)

  // Convert to blob (always use JPEG for thumbnails)
  return canvasToBlob(canvas, 'image/jpeg', IMAGE_CONFIG.JPEG_QUALITY)
}
