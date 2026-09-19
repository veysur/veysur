export class ErrorNetwork extends Error {
  ref: string
  message: string
  userMessage: string
  status: number
}

export default ErrorNetwork
