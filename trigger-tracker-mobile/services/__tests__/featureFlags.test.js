const {
  PAYWALL_GRANDFATHER_CUTOFF_MS,
  isGrandfatheredUser,
} = require("../featureFlags");

describe("isGrandfatheredUser", () => {
  test("returns true when createdAt is before the cutoff", () => {
    const user = { createdAt: PAYWALL_GRANDFATHER_CUTOFF_MS - 1 };
    expect(isGrandfatheredUser(user)).toBe(true);
  });

  test("returns false when createdAt is at or after the cutoff", () => {
    expect(
      isGrandfatheredUser({ createdAt: PAYWALL_GRANDFATHER_CUTOFF_MS })
    ).toBe(false);
    expect(
      isGrandfatheredUser({ createdAt: PAYWALL_GRANDFATHER_CUTOFF_MS + 1 })
    ).toBe(false);
  });

  test("returns false when user is null or undefined", () => {
    expect(isGrandfatheredUser(null)).toBe(false);
    expect(isGrandfatheredUser(undefined)).toBe(false);
  });

  test("grandfathers when createdAt is missing or not a number on an existing user", () => {
    expect(isGrandfatheredUser({})).toBe(true);
    expect(isGrandfatheredUser({ createdAt: null })).toBe(true);
    expect(isGrandfatheredUser({ createdAt: "2026-01-01" })).toBe(true);
  });
});
