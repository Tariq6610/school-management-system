/**
 * Typed storage errors for the School Management Platform prototype.
 * Specifically handles browser storage quota exhaustion (QuotaExceededError).
 */

export class StorageQuotaError extends Error {
  readonly originalError?: unknown;

  constructor(message = 'Browser localStorage quota exceeded. Please reset demo data.', originalError?: unknown) {
    super(message);
    this.name = 'StorageQuotaError';
    this.originalError = originalError;
    Object.setPrototypeOf(this, StorageQuotaError.prototype);
  }
}

/**
 * Type guard to check if an error is a storage quota error.
 * Checks for StorageQuotaError instance, DOMException QuotaExceededError,
 * and legacy browser error codes (code 22 or 1014).
 */
export function isQuotaError(error: unknown): error is StorageQuotaError | DOMException {
  if (error instanceof StorageQuotaError) {
    return true;
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as { name?: string; code?: number };
    if (
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22 ||
      err.code === 1014
    ) {
      return true;
    }
  }

  return false;
}
