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

  test("writes meals and symptoms to storage matching the returned counts", async () => {
    const summary = await loadDemoData();
    const meals = await getMeals();
    const symptoms = await getSymptoms();
    expect(meals).toHaveLength(summary.mealCount);
    expect(symptoms).toHaveLength(summary.symptomCount);
  });

  test("includes the today scan-result meal with trafficLight + reasonTags", async () => {
    await loadDemoData();
    const meals = await getMeals();
    const scan = meals.find((m) => m.source === "scan");
    expect(scan).toBeDefined();
    expect(scan.trafficLight).toBe("amber");
    expect(scan.label).toBe("Caution");
    expect(scan.reasonTags).toEqual(["caffeine", "acidic"]);
  });

  test("contains the coffee→heartburn pattern (≥7 coffee meals followed by heartburn within 90min)", async () => {
    await loadDemoData();
    const meals = await getMeals();
    const symptoms = await getSymptoms();

    const NINETY_MIN = 90 * 60 * 1000;
    const coffeeMeals = meals.filter((m) => /coffee/i.test(m.text));
    const heartburnSymptoms = symptoms.filter((s) =>
      (s.symptomTypes || []).includes("heartburn")
    );

    const coffeeFollowedByHeartburn = coffeeMeals.filter((meal) =>
      heartburnSymptoms.some((sym) => {
        const delta = sym.timestamp - meal.timestamp;
        return delta > 0 && delta <= NINETY_MIN;
      })
    );

    expect(coffeeFollowedByHeartburn.length).toBeGreaterThanOrEqual(7);
  });
});
