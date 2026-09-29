import { PropsOf } from '@datacapy/schema'
import { AxiosError } from 'axios'

export interface ErrorRestResponseData {
  ref?: string
  message?: string
  userMessage?: string
  // Array form for most endpoints; a path -> messages map for the survey
  // publish validation endpoint.
  errors?: Array<Record<string, unknown>> | Record<string, string[]>
  hint?: string
  [key: string]: unknown
}

export class ErrorRest extends Error {
  ref: string = ''
  message: string = ''
  userMessage: string = ''
  status?: number
  code?: string
  // Array form for most endpoints; a path -> messages map for the survey
  // publish validation endpoint.
  errors?: Array<Record<string, unknown>> | Record<string, string[]>
  hint?: string
  response?: { status: number; data?: ErrorRestResponseData }

  constructor(errorData: Partial<PropsOf<ErrorRest>>) {
    super()
    Object.assign(this, errorData)
  }

  static fromRequestError(error: Error | AxiosError) {
    const isAxiosError = (err: Error | AxiosError): err is AxiosError => {
      return 'response' in err
    }
    const responseData = (isAxiosError(error) ? error.response?.data : {}) as
      ErrorRestResponseData | undefined

    // Use response data if it has ref OR message field
    const hasValidResponseData =
      responseData && (responseData.ref || responseData.message)

    const errorData = hasValidResponseData
      ? {
          ref: responseData.ref || 'unknown',
          message: responseData.message || error.message,
          userMessage: responseData.userMessage || 'Error occurred',
          ...responseData, // Include all other fields (errors, hint, etc.)
        }
      : {
          ref: 'unknown',
          message: error.message,
          userMessage: 'Error occurred',
        }

    // Preserve HTTP status code and error code from AxiosError
    const result = new ErrorRest(errorData)
    if (isAxiosError(error)) {
      result.status = error.response?.status
      result.code = error.code
      result.response = error.response
        ? {
            status: error.response.status,
            data: error.response.data as ErrorRestResponseData | undefined,
          }
        : undefined
    }

    return result
  }
}
