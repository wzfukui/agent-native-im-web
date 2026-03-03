import type { APIResponse, APIErrorDetail } from './types'

let _errorHandler: ((error: ParsedError) => void) | null = null

export interface ParsedError {
  message: string
  detail?: APIErrorDetail
}

/**
 * Extract a human-readable error message from an API response.
 * Handles both old format (error: string) and new structured format (error: {code, message, ...}).
 */
export function extractError(res: APIResponse): ParsedError {
  if (!res.error) return { message: 'Unknown error' }

  if (typeof res.error === 'string') {
    return { message: res.error }
  }

  // Structured error
  return {
    message: res.error.message,
    detail: res.error,
  }
}

/**
 * Get just the error message string (backward compatible).
 */
export function getErrorMessage(res: APIResponse): string {
  return extractError(res).message
}

/**
 * Register a global error handler that gets called for all API errors.
 */
export function setGlobalErrorHandler(handler: (error: ParsedError) => void) {
  _errorHandler = handler
}

/**
 * Push an error to the global error handler if one is registered.
 */
export function reportError(error: ParsedError) {
  _errorHandler?.(error)
}

/**
 * Convenience: report from an API response if it's an error.
 */
export function reportApiError(res: APIResponse) {
  if (!res.ok) {
    reportError(extractError(res))
  }
}
