import { it, expect } from "vitest";
import { parseUtm } from "../utm";

it("extracts the four known utm params", () => {
  expect(
    parseUtm("?utm_source=meta&utm_medium=cpc&utm_campaign=launch&utm_content=hero")
  ).toEqual({
    utm_source: "meta",
    utm_medium: "cpc",
    utm_campaign: "launch",
    utm_content: "hero",
  });
});

it("ignores unrelated query params", () => {
  expect(parseUtm("?utm_source=meta&ref=friend&gclid=abc123")).toEqual({
    utm_source: "meta",
  });
});

it("returns {} for an empty search string", () => {
  expect(parseUtm("")).toEqual({});
});

it("returns {} when no utm params are present", () => {
  expect(parseUtm("?foo=bar")).toEqual({});
});

it("omits keys with empty values", () => {
  expect(parseUtm("?utm_source=&utm_medium=cpc")).toEqual({ utm_medium: "cpc" });
});

it("never throws on malformed input", () => {
  expect(() => parseUtm("not a query string %%")).not.toThrow();
});
