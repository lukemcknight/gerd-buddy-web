// Mock dependencies (same pattern as storage.recent-meals.test.js)
jest.mock("@react-native-async-storage/async-storage", () => {
  let store = {};
  return {
    __reset: () => {
      store = {};
    },
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
const { getCustomFoods, addCustomFood, removeCustomFood } = require("../storage");

beforeEach(() => {
  AsyncStorage.__reset();
});

describe("getCustomFoods", () => {
  test("returns empty array when nothing stored", async () => {
    expect(await getCustomFoods()).toEqual([]);
  });

  test("returns stored array", async () => {
    await addCustomFood("Kombucha");
    await addCustomFood("Bone broth");
    expect(await getCustomFoods()).toEqual(["Bone broth", "Kombucha"]);
  });
});

describe("addCustomFood", () => {
  test("adds a new food and returns true", async () => {
    const ok = await addCustomFood("Kombucha");
    expect(ok).toBe(true);
    expect(await getCustomFoods()).toEqual(["Kombucha"]);
  });

  test("prepends most-recent first", async () => {
    await addCustomFood("First");
    await addCustomFood("Second");
    expect(await getCustomFoods()).toEqual(["Second", "First"]);
  });

  test("trims whitespace", async () => {
    await addCustomFood("  Kombucha  ");
    expect(await getCustomFoods()).toEqual(["Kombucha"]);
  });

  test("rejects empty / whitespace-only input", async () => {
    expect(await addCustomFood("")).toBe(false);
    expect(await addCustomFood("   ")).toBe(false);
    expect(await addCustomFood(null)).toBe(false);
    expect(await addCustomFood(undefined)).toBe(false);
    expect(await getCustomFoods()).toEqual([]);
  });

  test("rejects case-insensitive duplicates", async () => {
    await addCustomFood("Kombucha");
    expect(await addCustomFood("kombucha")).toBe(false);
    expect(await addCustomFood("KOMBUCHA")).toBe(false);
    expect(await getCustomFoods()).toEqual(["Kombucha"]);
  });
});

describe("removeCustomFood", () => {
  test("removes a food by exact label", async () => {
    await addCustomFood("A");
    await addCustomFood("B");
    await addCustomFood("C");
    await removeCustomFood("B");
    expect(await getCustomFoods()).toEqual(["C", "A"]);
  });

  test("is a no-op for unknown food", async () => {
    await addCustomFood("A");
    await removeCustomFood("Z");
    expect(await getCustomFoods()).toEqual(["A"]);
  });
});
