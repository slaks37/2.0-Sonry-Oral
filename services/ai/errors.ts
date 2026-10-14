/**
 * AI Provider Error Hierarchy
 */

export type AIErrorCode =
  | 'MISSING_API_KEY'
  | 'INVALID_REQUEST'
  | 'AUTHENTICATION_FAILED'
  | 'PERMISSION_DENIED'
  | 'TIMEOUT'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE'
  | 'MALFORMED_RESPONSE'
  | 'VALIDATION_FAILED';

export class AIProviderError extends Error {
  public readonly code: AIErrorCode;
  public readonly statusCode: number;
  public readonly retryable: boolean;

  constructor(message: string, code: AIErrorCode, statusCode: number = 500, retryable: boolean = false) {
    super(message);
    this.name = 'AIProviderError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}
