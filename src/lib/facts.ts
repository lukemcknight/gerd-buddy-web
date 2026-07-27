import appFacts from "@/config/app-facts.json";

/**
 * Replace `{{dotted.path}}` tokens with verified values from config/app-facts.json.
 *
 * FAQ answers that quote a price, a rating, or an OS requirement use tokens rather
 * than literals, so those numbers live in exactly one place. AI assistants quote
 * these answers verbatim, so a stale price here becomes a wrong price in someone
 * else's answer engine.
 *
 * An unknown token is left visible rather than throwing: the same content is
 * rendered at build time by scripts/prerender.js, which DOES throw, so a typo
 * fails the build instead of blanking the page for a visitor.
 */
export const resolveFacts = (text: string): string =>
  text.replace(/\{\{([\w.]+)\}\}/g, (token, path: string) => {
    const value = path
      .split(".")
      .reduce<unknown>((acc, key) => (acc == null ? acc : (acc as Record<string, unknown>)[key]), appFacts);

    if (value === undefined || value === null) {
      console.warn(`[facts] unknown app-facts token: {{${path}}}`);
      return token;
    }
    return String(value);
  });
