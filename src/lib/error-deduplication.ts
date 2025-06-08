/**
 * Error Deduplication Service
 *
 * Prevents duplicate error reporting to Sentry from multiple error boundaries
 * Uses WeakSet for memory-efficient tracking of processed errors
 */

// WeakSet to track errors that have already been sent to Sentry
// Using WeakSet allows garbage collection of error objects
const processedErrors = new WeakSet<Error>();

// Map to track error fingerprints with timestamps
const errorFingerprints = new Map<string, number>();

// Cleanup old fingerprints every 5 minutes
const FINGERPRINT_TTL = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute

/**
 * Generate a fingerprint for an error
 */
function generateErrorFingerprint(error: Error): string {
  const parts = [
    error.name,
    error.message,
    // Include first 3 stack frames for better deduplication
    error.stack?.split('\n').slice(0, 4).join('|') || '',
  ];

  return parts.join('::');
}

/**
 * Check if an error has already been processed
 */
export function isErrorProcessed(error: Error): boolean {
  // Check WeakSet first (exact object reference)
  if (processedErrors.has(error)) {
    return true;
  }

  // Check fingerprint map for similar errors
  const fingerprint = generateErrorFingerprint(error);
  const lastSeen = errorFingerprints.get(fingerprint);

  if (lastSeen && Date.now() - lastSeen < FINGERPRINT_TTL) {
    return true;
  }

  return false;
}

/**
 * Mark an error as processed
 */
export function markErrorAsProcessed(error: Error): void {
  // Add to WeakSet
  processedErrors.add(error);

  // Add fingerprint with timestamp
  const fingerprint = generateErrorFingerprint(error);
  errorFingerprints.set(fingerprint, Date.now());
}

/**
 * Clean up old fingerprints to prevent memory leaks
 */
function cleanupOldFingerprints(): void {
  const now = Date.now();
  const expiredKeys: string[] = [];

  errorFingerprints.forEach((timestamp, key) => {
    if (now - timestamp > FINGERPRINT_TTL) {
      expiredKeys.push(key);
    }
  });

  expiredKeys.forEach(key => errorFingerprints.delete(key));
}

// Set up periodic cleanup
if (typeof window !== 'undefined') {
  setInterval(cleanupOldFingerprints, CLEANUP_INTERVAL);
}

/**
 * Check if error should be sent to Sentry
 * Returns true if the error is new and should be sent
 */
export function shouldSendToSentry(error: Error): boolean {
  if (isErrorProcessed(error)) {
    return false;
  }

  // Mark as processed for future checks
  markErrorAsProcessed(error);
  return true;
}

/**
 * Get deduplication stats (for debugging)
 */
export function getDeduplicationStats() {
  return {
    fingerprintCount: errorFingerprints.size,
    oldestFingerprint: Math.min(...Array.from(errorFingerprints.values())) || 0,
  };
}
