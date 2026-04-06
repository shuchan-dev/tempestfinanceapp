/**
 * Vanilla typescript validators
 */
export function validateString(value: any, minLength = 1, maxLength = 255): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length >= minLength && trimmed.length <= maxLength;
}

export function validateNumber(value: any, min = -Infinity, max = Infinity): boolean {
  if (typeof value !== 'number' || isNaN(value)) return false;
  return value >= min && value <= max;
}

export function validateEnum(value: any, allowedValues: string[]): boolean {
  if (typeof value !== 'string') return false;
  return allowedValues.includes(value);
}

/**
 * Sanitizes input text against basic XSS vectors
 */
export function sanitizeString(input: string | null | undefined): string | null {
  if (!input) return input === undefined ? null : input;
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&#x27;")
    .replace(/"/g, "&quot;")
    .trim();
}
