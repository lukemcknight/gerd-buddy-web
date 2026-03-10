// Mock dependencies
jest.mock("@react-native-async-storage/async-storage", () => {
  let store = {};
  return {
    getItem: jest.fn((key) => Promise.resolve(store[key] || null)),
    setItem: jest.fn((key, value) => {
      store[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
      return Promise.resolve();
    }),
    multiRemove: jest.fn(() => Promise.resolve()),
    __resetStore: () => { store = {}; },
    __setStore: (newStore) => { store = { ...newStore }; },
  };
});

jest.mock("../revenuecat", () => ({
  configureRevenueCat: jest.fn(() => Promise.resolve()),
  getSubscriptionStatus: jest.fn(() =>
    Promise.resolve({ active: false, isTrial: false, expiresAt: null })
  ),
}));

jest.mock("../firebase", () => ({
  auth: null,
  isFirebaseConfigured: false,
}));

jest.mock("../analytics", () => ({
  identifyUser: jest.fn(() => Promise.resolve()),
  trackEvent: jest.fn(() => Promise.resolve()),
}));

jest.mock("../reviewPrompt", () => ({
  maybePromptForReview: jest.fn(() => Promise.resolve()),
}));

const AsyncStorage = require("@react-native-async-storage/async-storage");
const { createUser, getUser, saveUser } = require("../storage");

// Must require after mocks
const {
  shouldShowPaywall,
  PAYWALL_CONFIG,
  getEntitlementState,
  ENTITLEMENTS,
} = require("../paywallTrigger");

beforeEach(() => {
  AsyncStorage.__resetStore();
  jest.clearAllMocks();
});

describe("shouldShowPaywall", () => {
  it("returns false when no user exists", async () => {
    const result = await shouldShowPaywall("post_scan");
    expect(result.show).toBe(false);
    expect(result.reason).toBe("no_user");
  });

  it("returns false for cold_start (outcomes-based)", async () => {
    await createUser({});
    const result = await shouldShowPaywall("cold_start");
    expect(result.show).toBe(false);
    expect(result.reason).toBe("no_cold_start");
  });

  it("returns false when user is subscribed", async () => {
    await createUser({});
    const user = await getUser();
    await saveUser({ ...user, subscriptionActive: true });

    const result = await shouldShowPaywall("post_scan");
    expect(result.show).toBe(false);
    expect(result.reason).toBe("already_subscribed");
  });

  it("returns true for post_scan when scan threshold reached", async () => {
    await createUser({});
    const user = await getUser();
    await saveUser({ ...user, scanCount: PAYWALL_CONFIG.scanThreshold });

    const result = await shouldShowPaywall("post_scan");
    expect(result.show).toBe(true);
    expect(result.source).toBe("post_scan");
  });

  it("returns false for post_scan below threshold", async () => {
    await createUser({});
    const user = await getUser();
    await saveUser({ ...user, scanCount: 1 });

    const result = await shouldShowPaywall("post_scan");
    expect(result.show).toBe(false);
  });

  it("returns true for post_insight", async () => {
    await createUser({});

    const result = await shouldShowPaywall("post_insight");
    expect(result.show).toBe(true);
    expect(result.source).toBe("post_insight");
  });

  it("returns true for manual trigger", async () => {
    await createUser({});

    const result = await shouldShowPaywall("manual");
    expect(result.show).toBe(true);
  });

  it("respects cooldown period", async () => {
    await createUser({});
    const user = await getUser();
    await saveUser({ ...user, lastPaywallShownAt: Date.now(), scanCount: 999 });

    const result = await shouldShowPaywall("post_scan");
    expect(result.show).toBe(false);
    expect(result.reason).toBe("cooldown");
  });

  it("allows showing after cooldown expires", async () => {
    await createUser({});
    const user = await getUser();
    const pastCooldown = Date.now() - PAYWALL_CONFIG.cooldownMs - 1000;
    await saveUser({ ...user, lastPaywallShownAt: pastCooldown, scanCount: 999 });

    const result = await shouldShowPaywall("post_scan");
    expect(result.show).toBe(true);
  });
});

describe("getEntitlementState", () => {
  it("returns free when no user", async () => {
    const state = await getEntitlementState();
    expect(state).toBe("free");
  });

  it("returns pro when subscribed", async () => {
    await createUser({});
    const user = await getUser();
    await saveUser({ ...user, subscriptionActive: true });

    const state = await getEntitlementState();
    expect(state).toBe("pro");
  });

  it("returns trial during trial period", async () => {
    await createUser({});
    const user = await getUser();
    // createUser sets trialEndsAt to 7 days from now by default
    const state = await getEntitlementState();
    expect(state).toBe("trial");
  });

  it("returns free after trial expires", async () => {
    await createUser({});
    const user = await getUser();
    await saveUser({ ...user, trialEndsAt: Date.now() - 1000 });

    const state = await getEntitlementState();
    expect(state).toBe("free");
  });
});

describe("ENTITLEMENTS structure", () => {
  it("free tier has limited scans", () => {
    expect(ENTITLEMENTS.free.scansPerDay).toBe(2);
    expect(ENTITLEMENTS.free.logging).toBe(true);
    expect(ENTITLEMENTS.free.weeklyReport).toBe(false);
  });

  it("pro tier has unlimited scans", () => {
    expect(ENTITLEMENTS.pro.scansPerDay).toBe(Infinity);
    expect(ENTITLEMENTS.pro.logging).toBe(true);
    expect(ENTITLEMENTS.pro.weeklyReport).toBe(true);
    expect(ENTITLEMENTS.pro.export).toBe(true);
  });
});
