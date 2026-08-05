import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import vm from "vm";
import { buildMetaPixelSnippet, buildGtagSnippet } from "../../../../../scripts/lib/ad-snippets.js";

/**
 * Coverage for the Meta Pixel + gtag.js head snippets (Task 12).
 *
 * A grep for "fbq"/"gtag" in the built HTML proves the snippet text is *present*; it does
 * not prove the snippet actually *works*. This suite runs the real snippet bodies -- both
 * scripts/lib/ad-snippets.js (imported directly, the module scripts/prerender.js uses) and
 * index.html's copy (read straight from the source file, not re-typed) -- in a sandboxed
 * vm context and asserts window.fbq / window.gtag end up as callable functions that queue
 * calls without throwing. This is the harness that catches a broken base-code stub (e.g.
 * `n=function(){...}` instead of `n=f.fbq=function(){...}`, which leaves window.fbq
 * undefined and makes every fbq() call site -- including analytics.ts's pixel() wrapper --
 * silently no-op forever) that a text-presence grep cannot.
 *
 * The vm sandbox's document/window are hand-rolled inert stubs (createElement,
 * getElementsByTagName, head.appendChild are all no-ops that just record what was asked of
 * them) so nothing here can trigger a real network request for fbevents.js or gtag/js.
 */

// Strips the outer <script ...>...</script> wrapper, returning just the JS body.
function scriptBody(tag: string): string {
  const match = tag.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error("no <script> body found in: " + tag);
  return match[1];
}

// Extracts one of index.html's guarded ad snippets by its data-ad-snippet marker, straight
// from the real committed source file.
function extractIndexHtmlSnippet(marker: string): string {
  const html = readFileSync(resolve(process.cwd(), "index.html"), "utf-8");
  const re = new RegExp(`<script[^>]*data-ad-snippet="${marker}"[^>]*>([\\s\\S]*?)<\\/script>`);
  const match = html.match(re);
  if (!match) throw new Error(`data-ad-snippet="${marker}" not found in index.html`);
  return match[1];
}

// A minimal, network-free DOM: createElement/getElementsByTagName/appendChild are inert
// stubs that just record what was asked of them. `window` self-references the sandbox, as
// it does in a real browser, so `window.fbq = ...` and a bare `fbq(...)` call are the same
// binding.
function makeSandbox(currentScriptAttrs: Record<string, string> = {}) {
  const insertedScripts: Array<Record<string, unknown>> = [];
  const appendedScripts: Array<Record<string, unknown>> = [];
  const existingScriptTag = {
    parentNode: { insertBefore: (el: Record<string, unknown>) => insertedScripts.push(el) },
  };
  const sandbox: Record<string, unknown> = {
    insertedScripts,
    appendedScripts,
    document: {
      createElement: () => ({ async: false, src: "" }),
      getElementsByTagName: () => [existingScriptTag],
      head: { appendChild: (el: Record<string, unknown>) => appendedScripts.push(el) },
      currentScript: { getAttribute: (name: string) => currentScriptAttrs[name] },
    },
  };
  sandbox.window = sandbox;
  return sandbox as Record<string, any>;
}

describe("Meta Pixel snippet (window.fbq)", () => {
  it("[ad-snippets.js] assigns window.fbq and queues track() calls without throwing, id set", () => {
    const sandbox = makeSandbox();
    const ctx = vm.createContext(sandbox);
    const body = scriptBody(buildMetaPixelSnippet("TEST123"));

    expect(() => vm.runInContext(body, ctx)).not.toThrow();
    expect(typeof sandbox.fbq).toBe("function");

    const before = sandbox.fbq.queue.length;
    expect(() => vm.runInContext(`fbq('track', 'CustomEvent', {foo: 1});`, ctx)).not.toThrow();
    expect(sandbox.fbq.queue.length).toBe(before + 1);

    // the fbevents.js loader was handed to our inert stub, never a real network call
    expect(sandbox.insertedScripts).toHaveLength(1);
    expect(sandbox.insertedScripts[0].src).toBe("https://connect.facebook.net/en_US/fbevents.js");
  });

  it("[index.html] assigns window.fbq and queues track() calls without throwing, id set", () => {
    const sandbox = makeSandbox({ "data-pixel-id": "TEST123" });
    const ctx = vm.createContext(sandbox);
    const body = extractIndexHtmlSnippet("meta-pixel");

    expect(() => vm.runInContext(body, ctx)).not.toThrow();
    expect(typeof sandbox.fbq).toBe("function");

    const before = sandbox.fbq.queue.length;
    expect(() => vm.runInContext(`fbq('track', 'CustomEvent', {foo: 1});`, ctx)).not.toThrow();
    expect(sandbox.fbq.queue.length).toBe(before + 1);
  });

  it("[ad-snippets.js] omits the snippet entirely when the id is unset", () => {
    expect(buildMetaPixelSnippet("")).toBe("");
  });

  it("[index.html] never assigns window.fbq when the %VITE_X% placeholder is unsubstituted", () => {
    const sandbox = makeSandbox({ "data-pixel-id": "%VITE_META_PIXEL_ID%" });
    const ctx = vm.createContext(sandbox);
    const body = extractIndexHtmlSnippet("meta-pixel");

    expect(() => vm.runInContext(body, ctx)).not.toThrow();
    expect(sandbox.fbq).toBeUndefined();
    expect(sandbox.insertedScripts).toHaveLength(0);
  });
});

describe("gtag snippet (window.gtag)", () => {
  it("[ad-snippets.js] assigns window.gtag and records js()/config() calls without throwing, id set", () => {
    const sandbox = makeSandbox();
    const ctx = vm.createContext(sandbox);
    const body = scriptBody(buildGtagSnippet("AW-TEST"));

    expect(() => vm.runInContext(body, ctx)).not.toThrow();
    expect(typeof sandbox.gtag).toBe("function");
    expect(Array.isArray(sandbox.dataLayer)).toBe(true);
    // the snippet itself calls gtag('js', ...) and gtag('config', id)
    expect(sandbox.dataLayer.length).toBeGreaterThanOrEqual(2);

    const before = sandbox.dataLayer.length;
    expect(() => vm.runInContext(`gtag('event', 'trial_started', {value: 1});`, ctx)).not.toThrow();
    expect(sandbox.dataLayer.length).toBe(before + 1);

    // the gtag.js loader was handed to our inert stub, never a real network call
    expect(sandbox.appendedScripts).toHaveLength(1);
    expect(sandbox.appendedScripts[0].src).toBe("https://www.googletagmanager.com/gtag/js?id=AW-TEST");
  });

  it("[index.html] assigns window.gtag and records js()/config() calls without throwing, id set", () => {
    const sandbox = makeSandbox({ "data-gtag-id": "AW-TEST" });
    const ctx = vm.createContext(sandbox);
    const body = extractIndexHtmlSnippet("gtag");

    expect(() => vm.runInContext(body, ctx)).not.toThrow();
    expect(typeof sandbox.gtag).toBe("function");
    expect(sandbox.dataLayer.length).toBeGreaterThanOrEqual(2);

    const before = sandbox.dataLayer.length;
    expect(() => vm.runInContext(`gtag('event', 'trial_started', {value: 1});`, ctx)).not.toThrow();
    expect(sandbox.dataLayer.length).toBe(before + 1);
  });

  it("[ad-snippets.js] omits the snippet entirely when the id is unset", () => {
    expect(buildGtagSnippet("")).toBe("");
  });

  it("[index.html] never assigns window.gtag when the %VITE_X% placeholder is unsubstituted", () => {
    const sandbox = makeSandbox({ "data-gtag-id": "%VITE_GOOGLE_ADS_ID%" });
    const ctx = vm.createContext(sandbox);
    const body = extractIndexHtmlSnippet("gtag");

    expect(() => vm.runInContext(body, ctx)).not.toThrow();
    expect(sandbox.gtag).toBeUndefined();
    expect(sandbox.appendedScripts).toHaveLength(0);
  });
});
