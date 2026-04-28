/**
 * Lightweight telemetry stub.
 *
 * Today this is a structured `console.info` with a stable schema. When a real
 * telemetry destination (Sentry, Datadog, Amplitude, etc.) is wired in, swap
 * the implementation here — the call sites use the same `trackEvent(name, props)`
 * shape regardless.
 *
 * Conventions:
 * - `event` is a short kebab-cased namespaced string: `area.action` or
 *   `area.subarea.action`. Keep them grep-able.
 * - `props` is a flat object of primitives. Avoid nested objects so future
 *   transports don't have to flatten.
 * - Avoid PII. Use IDs, not free-text where possible. Free-text fields like
 *   `notes` should be measured by length, not transmitted verbatim.
 */
export type TelemetryProps = Record<
  string,
  string | number | boolean | null | undefined
>;

export function trackEvent(event: string, props: TelemetryProps = {}): void {
  if (typeof window === 'undefined') return;
  // Tag for grep + future routing.
  console.info('[telemetry]', event, props);
}

/**
 * Classify an unknown error into PII-safe primitives suitable for telemetry.
 * Returns the HTTP status (when available) and the error kind, never the raw
 * message body — backend error messages can contain document or user details.
 */
export function classifyErrorForTelemetry(err: unknown): {
  errorStatus: number | string;
  errorKind: string;
} {
  if (typeof err === 'object' && err !== null) {
    if ('response' in err) {
      const status = (err as { response?: { status?: number } }).response
        ?.status;
      return {
        errorStatus: status ?? 'no-response',
        errorKind: 'http',
      };
    }
    return {
      errorStatus: 'no-response',
      errorKind: err instanceof Error ? err.name : 'unknown',
    };
  }
  return { errorStatus: 'no-response', errorKind: 'unknown' };
}
