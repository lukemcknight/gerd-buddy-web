import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the SDK module entirely: these tests never hit the network. `Purchases`
// is used as a static-call surface (Purchases.configure/.isConfigured/.getSharedInstance)
// so a plain object with vi.fn() members stands in for the real class.
// vi.mock factories are hoisted above imports, so the mock fns must be too.
const { configure, isConfigured, getSharedInstance } = vi.hoisted(() => ({
  configure: vi.fn(),
  isConfigured: vi.fn(() => false),
  getSharedInstance: vi.fn(),
}));

vi.mock("@revenuecat/purchases-js", () => ({
  Purchases: { configure, isConfigured, getSharedInstance },
}));

import { configureRC, getAnnualPackage, purchaseAnnual, hasPro, setUtmAttributes } from "../rc";

function fakeInstance(overrides: Record<string, unknown> = {}) {
  return {
    getAppUserId: vi.fn(() => "uid-123"),
    changeUser: vi.fn(),
    getOfferings: vi.fn(),
    purchase: vi.fn(),
    setAttributes: vi.fn(),
    getCustomerInfo: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  isConfigured.mockReturnValue(false);
  vi.stubEnv("VITE_RC_WEB_API_KEY", "rcb_sb_test_key");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("configureRC", () => {
  it("configures the SDK with the api key + uid when not already configured", () => {
    const instance = fakeInstance();
    configure.mockReturnValue(instance);

    const result = configureRC("uid-123");

    expect(configure).toHaveBeenCalledWith({
      apiKey: "rcb_sb_test_key",
      appUserId: "uid-123",
    });
    expect(result).toBe(instance);
  });

  it("reuses the shared instance when already configured for the same uid", () => {
    isConfigured.mockReturnValue(true);
    const instance = fakeInstance({ getAppUserId: vi.fn(() => "uid-123") });
    getSharedInstance.mockReturnValue(instance);

    const result = configureRC("uid-123");

    expect(configure).not.toHaveBeenCalled();
    expect(instance.changeUser).not.toHaveBeenCalled();
    expect(result).toBe(instance);
  });

  it("calls changeUser when already configured for a different uid", () => {
    isConfigured.mockReturnValue(true);
    const instance = fakeInstance({ getAppUserId: vi.fn(() => "old-uid") });
    getSharedInstance.mockReturnValue(instance);

    configureRC("new-uid");

    expect(instance.changeUser).toHaveBeenCalledWith("new-uid");
  });

  it("throws when the api key env var is missing", () => {
    vi.stubEnv("VITE_RC_WEB_API_KEY", "");
    expect(() => configureRC("uid-123")).toThrow();
  });
});

describe("getAnnualPackage", () => {
  it("returns the annual package from the gerd-buddy-web offering", async () => {
    const annualPkg = { identifier: "$rc_annual" };
    const instance = fakeInstance({
      getOfferings: vi.fn().mockResolvedValue({
        all: {
          "gerd-buddy-web": {
            annual: annualPkg,
            availablePackages: [annualPkg],
          },
        },
        current: null,
      }),
    });

    const pkg = await getAnnualPackage(instance as never);
    expect(pkg).toBe(annualPkg);
  });

  it("falls back to the gerd-buddy-web offering's first available package when .annual is null", async () => {
    const firstPkg = { identifier: "custom_pkg" };
    const instance = fakeInstance({
      getOfferings: vi.fn().mockResolvedValue({
        all: {
          "gerd-buddy-web": {
            annual: null,
            availablePackages: [firstPkg],
          },
        },
        current: null,
      }),
    });

    const pkg = await getAnnualPackage(instance as never);
    expect(pkg).toBe(firstPkg);
  });

  it("falls back to the current offering's first package when gerd-buddy-web is missing", async () => {
    const currentPkg = { identifier: "other_pkg" };
    const instance = fakeInstance({
      getOfferings: vi.fn().mockResolvedValue({
        all: {},
        current: { annual: null, availablePackages: [currentPkg] },
      }),
    });

    const pkg = await getAnnualPackage(instance as never);
    expect(pkg).toBe(currentPkg);
  });

  it("falls back to the current offering's .annual package when present", async () => {
    const currentAnnual = { identifier: "current_annual" };
    const instance = fakeInstance({
      getOfferings: vi.fn().mockResolvedValue({
        all: {},
        current: { annual: currentAnnual, availablePackages: [] },
      }),
    });

    const pkg = await getAnnualPackage(instance as never);
    expect(pkg).toBe(currentAnnual);
  });

  it("returns null when no package can be found anywhere", async () => {
    const instance = fakeInstance({
      getOfferings: vi.fn().mockResolvedValue({ all: {}, current: null }),
    });

    const pkg = await getAnnualPackage(instance as never);
    expect(pkg).toBeNull();
  });
});

describe("purchaseAnnual", () => {
  it("purchases the given package and resolves to customerInfo", async () => {
    const customerInfo = { entitlements: { active: {} } };
    const instance = fakeInstance({
      purchase: vi.fn().mockResolvedValue({ customerInfo }),
    });
    const pkg = { identifier: "$rc_annual" };

    const result = await purchaseAnnual(instance as never, pkg as never);

    expect(instance.purchase).toHaveBeenCalledWith({ rcPackage: pkg });
    expect(result).toBe(customerInfo);
  });
});

describe("hasPro", () => {
  it("matches the exact entitlement id", () => {
    expect(
      hasPro({ entitlements: { active: { "GERD Buddy Pro": {} } } } as never)
    ).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(
      hasPro({ entitlements: { active: { "gerd buddy pro": {} } } } as never)
    ).toBe(true);
  });

  it("matches whitespace-insensitively", () => {
    expect(
      hasPro({ entitlements: { active: { "  GERD Buddy Pro  ": {} } } } as never)
    ).toBe(true);
  });

  it("matches mixed case + whitespace variants", () => {
    expect(
      hasPro({ entitlements: { active: { " Gerd BUDDY pro ": {} } } } as never)
    ).toBe(true);
  });

  it("returns false when the entitlement is not active", () => {
    expect(hasPro({ entitlements: { active: {} } } as never)).toBe(false);
  });

  it("returns false when an unrelated entitlement is active", () => {
    expect(
      hasPro({ entitlements: { active: { other_entitlement: {} } } } as never)
    ).toBe(false);
  });

  it("returns false for null/undefined customerInfo", () => {
    expect(hasPro(null)).toBe(false);
    expect(hasPro(undefined)).toBe(false);
  });
});

describe("setUtmAttributes", () => {
  it("sets non-empty utm attributes and resolves true", async () => {
    const instance = fakeInstance({ setAttributes: vi.fn().mockResolvedValue(undefined) });

    const result = await setUtmAttributes(instance as never, {
      utm_source: "meta",
      utm_medium: "cpc",
    });

    expect(instance.setAttributes).toHaveBeenCalledWith({
      utm_source: "meta",
      utm_medium: "cpc",
    });
    expect(result).toBe(true);
  });

  it("returns false and does not call setAttributes when utm is empty", async () => {
    const instance = fakeInstance();

    const result = await setUtmAttributes(instance as never, {});

    expect(instance.setAttributes).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("returns false (does not throw) when setAttributes rejects", async () => {
    const instance = fakeInstance({
      setAttributes: vi.fn().mockRejectedValue(new Error("network")),
    });

    const result = await setUtmAttributes(instance as never, { utm_source: "meta" });
    expect(result).toBe(false);
  });
});
