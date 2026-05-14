// Mock AsyncStorage with the same in-memory pattern other storage tests use.
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

// Storage's saveMeal triggers a review prompt — silence it.
jest.mock("../reviewPrompt", () => ({
  maybePromptForReview: jest.fn(() => Promise.resolve()),
}));

// Storage imports analytics on load — silence it.
jest.mock("../analytics", () => ({
  identifyUser: jest.fn(() => Promise.resolve()),
  trackEvent: jest.fn(() => Promise.resolve()),
}));

// Storage imports revenuecat on load — silence it.
jest.mock("../revenuecat", () => ({
  configureRevenueCat: jest.fn(() => Promise.resolve()),
  getSubscriptionStatus: jest.fn(() =>
    Promise.resolve({ active: false, isTrial: false, expiresAt: null })
  ),
}));

const AsyncStorage = require("@react-native-async-storage/async-storage");
const { loadDemoData } = require("../demoData");
const { getMeals, getSymptoms } = require("../storage");

beforeEach(() => {
  AsyncStorage.__reset();
});

describe("loadDemoData", () => {
  test("returns a summary with mealCount and symptomCount", async () => {
    const summary = await loadDemoData();
    expect(summary).toEqual({
      mealCount: expect.any(Number),
      symptomCount: expect.any(Number),
    });
    expect(summary.mealCount).toBeGreaterThan(0);
    expect(summary.symptomCount).toBeGreaterThan(0);
  });
});
