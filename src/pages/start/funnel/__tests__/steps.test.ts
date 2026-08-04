import { FUNNEL_STEPS } from "../steps";

it("has 26 uniquely-id'd steps ending in account, paywall, success", () => {
  const ids = FUNNEL_STEPS.map((s) => s.id);
  expect(ids.length).toBe(26);
  expect(new Set(ids).size).toBe(26);
  expect(ids.slice(-3)).toEqual(["account", "paywall", "success"]);
});
it("select/multi steps all have at least 2 options", () => {
  for (const s of FUNNEL_STEPS.filter((s) => s.type === "select" || s.type === "multi"))
    expect(s.options!.length).toBeGreaterThanOrEqual(2);
});
it("copy contains no em-dashes", () => {
  const text = JSON.stringify(FUNNEL_STEPS);
  expect(text.includes("—")).toBe(false);
});
