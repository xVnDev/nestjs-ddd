/**
 * Redaction utilities for secrets and personally identifiable information.
 *
 * @module common/logger/redact
 */

/**
 * Normalised set of sensitive key names that must never be emitted in logs.
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'authorization',
  'secret',
  'apikey',
  'refreshtoken',
  'accesstoken',
  'ssn',
  'email',
  'phone',
  'address',
  'ip',
  'useragent',
  'cookie',
]);

/**
 * Determines whether a property key represents sensitive data.
 *
 * @param key - The property key to inspect.
 * @returns `true` when the key is sensitive.
 */
function isSensitive(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase().replace(/[^a-z0-9]/g, ''));
}

/**
 * Recursively replaces sensitive values with `[REDACTED]` without mutating input.
 *
 * @param value - The value to redact.
 * @returns A redacted copy of the input value.
 */
export function redact(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitive(key)) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = redact(val);
    }
  }
  return result;
}
