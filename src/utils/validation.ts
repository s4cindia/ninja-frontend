/**
 * Validation utilities for user input and server responses
 */

/**
 * Validates a job ID format to prevent path traversal and injection attacks.
 *
 * Job IDs should only contain:
 * - Alphanumeric characters (a-z, A-Z, 0-9)
 * - Hyphens (-)
 * - Underscores (_)
 *
 * @param jobId - The job ID to validate
 * @returns true if the job ID is valid, false otherwise
 *
 * @example
 * ```ts
 * validateJobId('abc-123_def')  // true
 * validateJobId('../etc/passwd') // false
 * validateJobId('job@123')       // false
 * ```
 */
export function validateJobId(jobId: string | null | undefined): jobId is string {
  if (!jobId) {
    return false;
  }

  // Only allow alphanumeric characters, hyphens, and underscores
  return /^[a-zA-Z0-9-_]+$/.test(jobId);
}

/**
 * Validates a job ID and throws an error if invalid.
 * Useful for defensive programming in critical paths.
 *
 * @param jobId - The job ID to validate
 * @throws {Error} If the job ID is invalid
 *
 * @example
 * ```ts
 * try {
 *   assertValidJobId(jobId);
 *   // Proceed with jobId
 * } catch (error) {
 *   // Handle invalid jobId
 * }
 * ```
 */
export function assertValidJobId(jobId: string | null | undefined): asserts jobId is string {
  if (!validateJobId(jobId)) {
    throw new Error('Invalid job ID format');
  }
}
