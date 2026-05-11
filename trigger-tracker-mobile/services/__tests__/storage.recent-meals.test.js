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

const { getRecentMealSuggestions } = require('../storage');

describe('getRecentMealSuggestions', () => {
  const meal = (text, ts) => ({ text, timestamp: ts });

  test('returns empty array for empty history', () => {
    expect(getRecentMealSuggestions([])).toEqual([]);
  });

  test('returns most-recent first', () => {
    const meals = [
      meal('coffee', 1000),
      meal('toast', 2000),
      meal('eggs', 3000),
    ];
    expect(getRecentMealSuggestions(meals)).toEqual(['eggs', 'toast', 'coffee']);
  });

  test('dedupes by normalized text, keeping most recent casing', () => {
    const meals = [
      meal('Coffee', 1000),
      meal('coffee', 2000),
      meal('  COFFEE ', 3000),
    ];
    expect(getRecentMealSuggestions(meals)).toEqual(['COFFEE']);
  });

  test('respects limit', () => {
    const meals = Array.from({ length: 15 }, (_, i) =>
      meal(`meal-${i}`, i * 1000)
    );
    expect(getRecentMealSuggestions(meals, 3)).toEqual(['meal-14', 'meal-13', 'meal-12']);
  });

  test('only scans the most recent 30 meals', () => {
    const meals = Array.from({ length: 50 }, (_, i) =>
      meal('old', i * 1000)
    );
    meals.push(meal('new', 100000));
    const result = getRecentMealSuggestions(meals, 10);
    expect(result).toEqual(['new', 'old']);
  });

  test('default limit is 10', () => {
    const meals = Array.from({ length: 20 }, (_, i) =>
      meal(`m-${i}`, i * 1000)
    );
    expect(getRecentMealSuggestions(meals)).toHaveLength(10);
  });
});
