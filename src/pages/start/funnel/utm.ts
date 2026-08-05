const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;

/**
 * Parses UTM params out of a `location.search`-style query string.
 * Only known UTM keys are returned; empty/missing values are omitted.
 * Returns {} when no UTM params are present (never throws).
 */
export function parseUtm(search: string): Record<string, string> {
  const result: Record<string, string> = {};

  try {
    const params = new URLSearchParams(search);
    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value && value.trim()) {
        result[key] = value.trim();
      }
    }
  } catch {
    // malformed search string: return whatever we've gathered so far (likely {})
  }

  return result;
}
