/**
 * Tests for smart / behavioral notification system
 *
 * Key behavior tested:
 * - syncSmartNotifications orchestrates builders, anti-spam, and scheduling
 * - Each builder produces the correct notification or null based on data
 * - Quiet hours (9 PM – 8 AM) are respected
 * - Known triggers are seeded on first run and diffed on subsequent runs
 * - Anti-spam limits behavioral notifications to 2, trigger bypasses limit
 * - Cancellation clears all previously scheduled smart notifications
 */

// --- Mocks ---

jest.mock("react-native", () => ({
  Linking: { openSettings: jest.fn() },
  Platform: { OS: "ios" },
}));

const mockSchedule = jest.fn(() => Promise.resolve("notif-id-1"));
const mockCancel = jest.fn(() => Promise.resolve());
const mockGetAllScheduled = jest.fn(() => Promise.resolve([]));
const mockGetPermissions = jest.fn(() =>
  Promise.resolve({ status: "granted", granted: true })
);
const mockSetChannel = jest.fn(() => Promise.resolve());

jest.mock("expo-notifications", () => ({
  scheduleNotificationAsync: (...args) => mockSchedule(...args),
  cancelScheduledNotificationAsync: (...args) => mockCancel(...args),
  getAllScheduledNotificationsAsync: (...args) => mockGetAllScheduled(...args),
  getPermissionsAsync: (...args) => mockGetPermissions(...args),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: (...args) => mockSetChannel(...args),
  AndroidImportance: { DEFAULT: 3 },
}));

jest.mock("expo-device", () => ({ isDevice: true }));
jest.mock("expo-constants", () => ({
  expoConfig: { extra: { eas: { projectId: "test" } } },
}));

const storage = {};
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn((key) => Promise.resolve(storage[key] ?? null)),
  setItem: jest.fn((key, val) => {
    storage[key] = val;
    return Promise.resolve();
  }),
  multiRemove: jest.fn((keys) => {
    keys.forEach((k) => delete storage[k]);
    return Promise.resolve();
  }),
}));

// Mock storage functions
const mockGetMeals = jest.fn(() => Promise.resolve([]));
const mockGetSymptoms = jest.fn(() => Promise.resolve([]));
const mockGetUser = jest.fn(() =>
  Promise.resolve({ remindersEnabled: true, bestStreak: 0 })
);
const mockGetStreakInfo = jest.fn(() => ({
  currentStreak: 0,
  bestStreak: 0,
  loggedToday: false,
  shouldUpdateBest: false,
}));

jest.mock("../../services/storage", () => ({
  getMeals: (...args) => mockGetMeals(...args),
  getSymptoms: (...args) => mockGetSymptoms(...args),
  getUser: (...args) => mockGetUser(...args),
  getStreakInfo: (...args) => mockGetStreakInfo(...args),
}));

const mockCalculateTriggers = jest.fn(() => []);
jest.mock("../../utils/triggerEngine", () => ({
  calculateTriggers: (...args) => mockCalculateTriggers(...args),
}));

// Require after mocks
const { syncSmartNotifications } = require("../notifications");
const AsyncStorage = require("@react-native-async-storage/async-storage");

// --- Helpers ---

const NOW = new Date("2026-02-19T14:00:00").getTime(); // 2 PM on a Thursday

const makeMeal = (text, hoursAgo) => ({
  id: `meal-${hoursAgo}`,
  text,
  timestamp: NOW - hoursAgo * 60 * 60 * 1000,
  createdAt: NOW - hoursAgo * 60 * 60 * 1000,
});

const makeSymptom = (severity, hoursAgo) => ({
  id: `sym-${hoursAgo}`,
  severity,
  timestamp: NOW - hoursAgo * 60 * 60 * 1000,
  createdAt: NOW - hoursAgo * 60 * 60 * 1000,
});

// --- Tests ---

describe("Smart Notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear storage
    Object.keys(storage).forEach((k) => delete storage[k]);
    // Reset Date.now
    jest.spyOn(Date, "now").mockReturnValue(NOW);

    // Default mocks: permission granted, user with reminders on
    mockGetPermissions.mockResolvedValue({
      status: "granted",
      granted: true,
    });
    mockGetUser.mockResolvedValue({
      remindersEnabled: true,
      bestStreak: 0,
    });
    mockGetMeals.mockResolvedValue([]);
    mockGetSymptoms.mockResolvedValue([]);
    mockGetStreakInfo.mockReturnValue({
      currentStreak: 0,
      bestStreak: 0,
      loggedToday: false,
      shouldUpdateBest: false,
    });
    mockCalculateTriggers.mockReturnValue([]);

    // Each schedule call returns a unique ID
    let counter = 0;
    mockSchedule.mockImplementation(() =>
      Promise.resolve(`smart-id-${++counter}`)
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("syncSmartNotifications - gating", () => {
    test("cancels all and bails when permission not granted", async () => {
      mockGetPermissions.mockResolvedValue({
        status: "denied",
        granted: false,
      });

      await syncSmartNotifications();

      expect(mockSchedule).not.toHaveBeenCalled();
    });

    test("cancels all and bails when reminders disabled", async () => {
      mockGetUser.mockResolvedValue({ remindersEnabled: false });

      await syncSmartNotifications();

      expect(mockSchedule).not.toHaveBeenCalled();
    });

    test("cancels all and bails when user is null (pre-onboarding)", async () => {
      mockGetUser.mockResolvedValue(null);

      await syncSmartNotifications();

      expect(mockSchedule).not.toHaveBeenCalled();
    });

    test("treats missing remindersEnabled as true (default)", async () => {
      mockGetUser.mockResolvedValue({ bestStreak: 0 });
      mockGetStreakInfo.mockReturnValue({
        currentStreak: 3,
        loggedToday: false,
      });

      await syncSmartNotifications();

      // Should have scheduled something (streak at risk at minimum)
      expect(mockSchedule).toHaveBeenCalled();
    });
  });

  describe("cancellation", () => {
    test("cancels previously stored smart notification IDs before scheduling", async () => {
      // Pre-populate stored IDs
      storage["smart_notification_ids_v1"] = JSON.stringify([
        "old-1",
        "old-2",
      ]);

      await syncSmartNotifications();

      expect(mockCancel).toHaveBeenCalledWith("old-1");
      expect(mockCancel).toHaveBeenCalledWith("old-2");
    });

    test("gracefully handles cancel failures", async () => {
      storage["smart_notification_ids_v1"] = JSON.stringify(["bad-id"]);
      mockCancel.mockRejectedValueOnce(new Error("not found"));

      // Should not throw
      await syncSmartNotifications();
    });
  });

  describe("buildStreakAtRiskNotification", () => {
    test("schedules for tomorrow 10 AM when streak > 0 and not logged today", async () => {
      mockGetStreakInfo.mockReturnValue({
        currentStreak: 5,
        loggedToday: false,
      });

      await syncSmartNotifications();

      expect(mockSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: "Don't lose your streak!",
            body: "A quick log keeps your 5-day streak alive.",
          }),
        })
      );
    });

    test("does not schedule when already logged today", async () => {
      mockGetStreakInfo.mockReturnValue({
        currentStreak: 5,
        loggedToday: true,
      });

      await syncSmartNotifications();

      const streakCalls = mockSchedule.mock.calls.filter(
        (call) => call[0]?.content?.data?.reminderType === "smart_streak"
      );
      expect(streakCalls).toHaveLength(0);
    });

    test("does not schedule when streak is 0", async () => {
      mockGetStreakInfo.mockReturnValue({
        currentStreak: 0,
        loggedToday: false,
      });

      await syncSmartNotifications();

      const streakCalls = mockSchedule.mock.calls.filter(
        (call) => call[0]?.content?.data?.reminderType === "smart_streak"
      );
      expect(streakCalls).toHaveLength(0);
    });
  });

  describe("buildPostMealCheckNotification", () => {
    test("schedules 2h after most recent meal when no symptom logged", async () => {
      const meal = makeMeal("chicken rice", 1); // 1h ago = 1 PM
      mockGetMeals.mockResolvedValue([meal]);

      await syncSmartNotifications();

      // Should schedule for 2h after meal = 3 PM
      const postMealCalls = mockSchedule.mock.calls.filter(
        (call) => call[0]?.content?.data?.reminderType === "smart_postmeal"
      );
      expect(postMealCalls).toHaveLength(1);
      expect(postMealCalls[0][0].content.body).toContain(
        "2 hours since your last meal"
      );
    });

    test("does not schedule when symptom logged after meal", async () => {
      const meal = makeMeal("pizza", 1); // 1h ago
      const symptom = makeSymptom(3, 0.5); // 30min ago (after meal)
      mockGetMeals.mockResolvedValue([meal]);
      mockGetSymptoms.mockResolvedValue([symptom]);

      await syncSmartNotifications();

      const postMealCalls = mockSchedule.mock.calls.filter(
        (call) => call[0]?.content?.data?.reminderType === "smart_postmeal"
      );
      expect(postMealCalls).toHaveLength(0);
    });

    test("does not schedule when meal is > 4h old", async () => {
      const meal = makeMeal("salad", 5); // 5h ago
      mockGetMeals.mockResolvedValue([meal]);

      await syncSmartNotifications();

      const postMealCalls = mockSchedule.mock.calls.filter(
        (call) => call[0]?.content?.data?.reminderType === "smart_postmeal"
      );
      expect(postMealCalls).toHaveLength(0);
    });

    test("does not schedule when trigger time is in quiet hours", async () => {
      // Set time to 8 PM, meal 30min ago => trigger at 9:30 PM (quiet hours)
      jest.spyOn(Date, "now").mockReturnValue(
        new Date("2026-02-19T20:00:00").getTime()
      );
      const meal = {
        id: "m1",
        text: "late snack",
        timestamp: new Date("2026-02-19T19:30:00").getTime(),
        createdAt: new Date("2026-02-19T19:30:00").getTime(),
      };
      mockGetMeals.mockResolvedValue([meal]);

      await syncSmartNotifications();

      const postMealCalls = mockSchedule.mock.calls.filter(
        (call) => call[0]?.content?.data?.reminderType === "smart_postmeal"
      );
      expect(postMealCalls).toHaveLength(0);
    });

    test("does not schedule when trigger time already passed", async () => {
      // Meal was 3h ago => trigger would be 1h ago (already passed)
      const meal = makeMeal("breakfast", 3);
      mockGetMeals.mockResolvedValue([meal]);

      await syncSmartNotifications();

      const postMealCalls = mockSchedule.mock.calls.filter(
        (call) => call[0]?.content?.data?.reminderType === "smart_postmeal"
      );
      expect(postMealCalls).toHaveLength(0);
    });
  });

  describe("buildSymptomFreeDayNotification", () => {
    test("schedules for 8:30 PM when no symptoms today", async () => {
      // No symptoms at all
      mockGetSymptoms.mockResolvedValue([]);

      await syncSmartNotifications();

      const calls = mockSchedule.mock.calls.filter(
        (call) =>
          call[0]?.content?.data?.reminderType === "smart_symptomfree"
      );
      expect(calls).toHaveLength(1);
      expect(calls[0][0].content.title).toBe("Great day so far!");
    });

    test("does not schedule when symptom logged today", async () => {
      const symptom = makeSymptom(2, 1); // 1h ago (today)
      mockGetSymptoms.mockResolvedValue([symptom]);

      await syncSmartNotifications();

      const calls = mockSchedule.mock.calls.filter(
        (call) =>
          call[0]?.content?.data?.reminderType === "smart_symptomfree"
      );
      expect(calls).toHaveLength(0);
    });

    test("does not schedule when 8:30 PM already passed", async () => {
      // Use a time after 8:30 PM local time
      const late = new Date();
      late.setHours(21, 0, 0, 0);
      jest.spyOn(Date, "now").mockReturnValue(late.getTime());

      await syncSmartNotifications();

      const calls = mockSchedule.mock.calls.filter(
        (call) =>
          call[0]?.content?.data?.reminderType === "smart_symptomfree"
      );
      expect(calls).toHaveLength(0);
    });

    test("counts symptom-free days in past week correctly", async () => {
      // Symptoms on 2 of the past 7 days
      const symptoms = [
        makeSymptom(3, 24), // yesterday
        makeSymptom(2, 72), // 3 days ago
      ];
      mockGetSymptoms.mockResolvedValue(symptoms);

      await syncSmartNotifications();

      const calls = mockSchedule.mock.calls.filter(
        (call) =>
          call[0]?.content?.data?.reminderType === "smart_symptomfree"
      );
      expect(calls).toHaveLength(1);
      // 7 days - 2 days with symptoms = 5 symptom-free
      expect(calls[0][0].content.body).toContain("5 symptom-free days");
    });
  });

  describe("buildNewTriggerNotification", () => {
    test("seeds known triggers on first run without notifying", async () => {
      mockCalculateTriggers.mockReturnValue([
        { ingredient: "coffee", confidence: 0.7, symptomRate: 80 },
        { ingredient: "pizza", confidence: 0.5, symptomRate: 60 },
      ]);

      await syncSmartNotifications();

      // Should NOT schedule a trigger notification on first run
      const calls = mockSchedule.mock.calls.filter(
        (call) => call[0]?.content?.data?.reminderType === "smart_trigger"
      );
      expect(calls).toHaveLength(0);

      // Should have stored known triggers
      const stored = JSON.parse(storage["known_triggers_v1"]);
      expect(stored).toContain("coffee");
      expect(stored).toContain("pizza");
    });

    test("notifies when new trigger found on subsequent run", async () => {
      // Seed known triggers first
      storage["known_triggers_v1"] = JSON.stringify(["coffee"]);

      mockCalculateTriggers.mockReturnValue([
        { ingredient: "coffee", confidence: 0.7, symptomRate: 80 },
        { ingredient: "pizza", confidence: 0.6, symptomRate: 65 },
      ]);

      await syncSmartNotifications();

      const calls = mockSchedule.mock.calls.filter(
        (call) => call[0]?.content?.data?.reminderType === "smart_trigger"
      );
      expect(calls).toHaveLength(1);
      expect(calls[0][0].content.body).toContain("pizza");
      expect(calls[0][0].content.body).toContain("65%");
    });

    test("does not notify when all triggers already known", async () => {
      storage["known_triggers_v1"] = JSON.stringify(["coffee", "pizza"]);

      mockCalculateTriggers.mockReturnValue([
        { ingredient: "coffee", confidence: 0.7, symptomRate: 80 },
        { ingredient: "pizza", confidence: 0.6, symptomRate: 65 },
      ]);

      await syncSmartNotifications();

      const calls = mockSchedule.mock.calls.filter(
        (call) => call[0]?.content?.data?.reminderType === "smart_trigger"
      );
      expect(calls).toHaveLength(0);
    });

    test("ignores triggers below confidence threshold", async () => {
      storage["known_triggers_v1"] = JSON.stringify([]);

      mockCalculateTriggers.mockReturnValue([
        { ingredient: "garlic", confidence: 0.3, symptomRate: 40 },
      ]);

      await syncSmartNotifications();

      const calls = mockSchedule.mock.calls.filter(
        (call) => call[0]?.content?.data?.reminderType === "smart_trigger"
      );
      expect(calls).toHaveLength(0);
    });

    test("does not notify during quiet hours", async () => {
      jest.spyOn(Date, "now").mockReturnValue(
        new Date("2026-02-19T22:00:00").getTime()
      );

      storage["known_triggers_v1"] = JSON.stringify([]);
      mockCalculateTriggers.mockReturnValue([
        { ingredient: "spicy food", confidence: 0.8, symptomRate: 90 },
      ]);

      await syncSmartNotifications();

      const calls = mockSchedule.mock.calls.filter(
        (call) => call[0]?.content?.data?.reminderType === "smart_trigger"
      );
      expect(calls).toHaveLength(0);
    });
  });

  describe("anti-spam", () => {
    test("limits behavioral notifications to 2 per sync", async () => {
      // Set up conditions so all 3 behavioral builders fire
      mockGetStreakInfo.mockReturnValue({
        currentStreak: 5,
        loggedToday: false,
      });
      const meal = makeMeal("chicken", 1);
      mockGetMeals.mockResolvedValue([meal]);
      mockGetSymptoms.mockResolvedValue([]);

      await syncSmartNotifications();

      // Should have at most 2 behavioral notifications
      // (streak, postmeal, symptomfree — only 2 allowed)
      const behavioralTypes = ["smart_streak", "smart_postmeal", "smart_symptomfree"];
      const behavioralCalls = mockSchedule.mock.calls.filter((call) =>
        behavioralTypes.includes(call[0]?.content?.data?.reminderType)
      );
      expect(behavioralCalls.length).toBeLessThanOrEqual(2);
    });

    test("trigger notification bypasses anti-spam limit", async () => {
      // Set up conditions so behavioral builders fire
      mockGetStreakInfo.mockReturnValue({
        currentStreak: 5,
        loggedToday: false,
      });
      const meal = makeMeal("chicken", 1);
      mockGetMeals.mockResolvedValue([meal]);
      mockGetSymptoms.mockResolvedValue([]);

      // Also set up a new trigger
      storage["known_triggers_v1"] = JSON.stringify([]);
      mockCalculateTriggers.mockReturnValue([
        { ingredient: "garlic", confidence: 0.7, symptomRate: 75 },
      ]);

      await syncSmartNotifications();

      // Trigger notification should exist regardless of behavioral limit
      const triggerCalls = mockSchedule.mock.calls.filter(
        (call) => call[0]?.content?.data?.reminderType === "smart_trigger"
      );
      expect(triggerCalls).toHaveLength(1);

      // Total should be at most 3 (2 behavioral + 1 trigger)
      expect(mockSchedule.mock.calls.length).toBeLessThanOrEqual(3);
    });
  });

  describe("ID persistence", () => {
    test("stores scheduled notification IDs for later cancellation", async () => {
      mockGetStreakInfo.mockReturnValue({
        currentStreak: 3,
        loggedToday: false,
      });

      await syncSmartNotifications();

      const stored = JSON.parse(
        storage["smart_notification_ids_v1"] || "[]"
      );
      expect(stored.length).toBeGreaterThan(0);
      expect(stored[0]).toMatch(/^smart-id-/);
    });

    test("stores empty array when no notifications scheduled", async () => {
      // No conditions met for any notification
      mockGetStreakInfo.mockReturnValue({
        currentStreak: 0,
        loggedToday: true,
      });
      // Set time to 9 PM so symptom-free skips too
      const late = new Date();
      late.setHours(21, 30, 0, 0);
      jest.spyOn(Date, "now").mockReturnValue(late.getTime());
      // Also add a symptom today so symptom-free doesn't fire
      const todaySymptom = {
        id: "s1",
        severity: 2,
        timestamp: late.getTime() - 60 * 60 * 1000,
        createdAt: late.getTime() - 60 * 60 * 1000,
      };
      mockGetSymptoms.mockResolvedValue([todaySymptom]);

      await syncSmartNotifications();

      const stored = JSON.parse(
        storage["smart_notification_ids_v1"] || "[]"
      );
      expect(stored).toEqual([]);
    });
  });

  describe("error resilience", () => {
    test("does not throw when schedule fails", async () => {
      mockGetStreakInfo.mockReturnValue({
        currentStreak: 3,
        loggedToday: false,
      });
      mockSchedule.mockRejectedValue(new Error("scheduling failed"));

      // Should not throw — the outer try/catch handles it
      await expect(syncSmartNotifications()).resolves.toBeUndefined();
    });

    test("does not throw when storage read fails", async () => {
      AsyncStorage.getItem.mockRejectedValueOnce(new Error("storage err"));

      await expect(syncSmartNotifications()).resolves.toBeUndefined();
    });
  });
});
