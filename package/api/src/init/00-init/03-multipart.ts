import { Server } from 'mzen-server'
import { IncomingForm } from 'formidable'
import { app as appConfig } from 'config/default'

export const initMultipart = function (server: Server) {
  server.router.use(function (req, res, next) {
    // Only parse multipart/form-data requests
    if (!req.headers['content-type']?.startsWith('multipart/form-data')) {
      return next()
    }

    const form = new IncomingForm({
      maxFileSize: appConfig.upload.maxFileSize,
      allowEmptyFiles: false,
    })

    form.parse(req, (err, fields, files) => {
      if (err) {
        return res.status(400).json({
          error: 'MultipartParseError',
          message: 'Failed to parse multipart form data',
          details: err.message,
        })
      }

      // Convert formidable format to simpler format
      // Formidable v3 returns arrays for all fields/files
      const parsedFields: Record<string, string | string[]> = {}
      const parsedFiles: Record<
        string,
        { filename: string; filepath: string; mimeType: string; size: number }
      > = {}

      // Process fields
      Object.keys(fields).forEach((key) => {
        const value = fields[key]
        // If array with single value, unwrap it
        parsedFields[key] =
          Array.isArray(value) && value.length === 1 ? value[0] : value
      })

      // Process files
      Object.keys(files).forEach((key) => {
        const fileArray = files[key]
        if (!fileArray || !Array.isArray(fileArray) || fileArray.length === 0) {
          return
        }

        const file = fileArray[0] // Take first file for each field
        parsedFiles[key] = {
          filename: file.originalFilename || 'unnamed',
          filepath: file.filepath, // Temporary file path
          mimeType: file.mimetype || 'application/octet-stream',
          size: file.size,
        }
      })

      // Merge into req.body
      req.body = {
        ...req.body,
        ...parsedFields,
        ...parsedFiles,
      }

      next()
    })
  })
}

export default initMultipart
