// Mock AsyncStorage
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
    __resetStore: () => {
      store = {};
    },
  };
});

const AsyncStorage = require("@react-native-async-storage/async-storage");

const {
  generatePlan,
  getOnboardingPlan,
  saveOnboardingPlan,
  clearOnboardingPlan,
  toggleTask,
  getCurrentPlanDay,
  isPlanActive,
  isPlanComplete,
  getDay7Summary,
  FEAR_FOOD_OPTIONS,
  MEAL_TIME_OPTIONS,
  MEDS_OPTIONS,
} = require("../onboardingPlan");

const baseTriage = {
  severity: "moderate",
  fearFoods: ["coffee", "chocolate"],
  customFearFoods: ["avocado"],
  mealTimes: ["breakfast", "lunch", "dinner"],
  medsStatus: "ppi",
};

beforeEach(() => {
  AsyncStorage.__resetStore();
  jest.clearAllMocks();
});

describe("generatePlan", () => {
  it("creates a 7-day plan with tasks", async () => {
    const plan = await generatePlan(baseTriage);

    expect(plan).toBeDefined();
    expect(plan.id).toMatch(/^plan_/);
    expect(plan.days).toHaveLength(7);
    expect(plan.completedDays).toEqual([]);
    expect(plan.triage).toEqual(baseTriage);
    expect(plan.timezone).toBeDefined();

    // Each day should have 2-4 tasks
    for (const day of plan.days) {
      expect(day.day).toBeGreaterThanOrEqual(1);
      expect(day.day).toBeLessThanOrEqual(7);
      expect(day.focus).toBeTruthy();
      expect(day.tasks.length).toBeGreaterThanOrEqual(2);
      expect(day.tasks.length).toBeLessThanOrEqual(5);
      for (const task of day.tasks) {
        expect(task.id).toBeTruthy();
        expect(task.text).toBeTruthy();
        expect(task.completed).toBe(false);
      }
    }
  });

  it("is idempotent - does not regenerate if plan exists", async () => {
    const plan1 = await generatePlan(baseTriage);
    const plan2 = await generatePlan({ ...baseTriage, severity: "severe" });

    expect(plan1.id).toEqual(plan2.id);
    expect(plan2.triage.severity).toBe("moderate"); // Original preserved
  });

  it("generates extra tasks for severe severity", async () => {
    const plan = await generatePlan({ ...baseTriage, severity: "severe" });
    const day1 = plan.days[0];
    const hasAvoidTask = day1.tasks.some((t) =>
      t.text.toLowerCase().includes("fear food")
    );
    expect(hasAvoidTask).toBe(true);
  });

  it("adjusts tasks when user is on meds", async () => {
    const plan = await generatePlan({ ...baseTriage, medsStatus: "ppi" });
    const day2 = plan.days[1];
    const hasMedsTask = day2.tasks.some((t) =>
      t.text.toLowerCase().includes("medication")
    );
    expect(hasMedsTask).toBe(true);
  });
});

describe("toggleTask", () => {
  it("marks a task as complete and tracks day completion", async () => {
    const plan = await generatePlan(baseTriage);
    const day1 = plan.days[0];
    const taskId = day1.tasks[0].id;

    const updated = await toggleTask(1, taskId);
    expect(updated.days[0].tasks[0].completed).toBe(true);
    expect(updated.days[0].tasks[0].completedAt).toBeDefined();
  });

  it("toggles a task back to incomplete", async () => {
    const plan = await generatePlan(baseTriage);
    const day1 = plan.days[0];
    const taskId = day1.tasks[0].id;

    await toggleTask(1, taskId); // complete
    const updated = await toggleTask(1, taskId); // uncomplete
    expect(updated.days[0].tasks[0].completed).toBe(false);
  });

  it("marks day as completed when all tasks done", async () => {
    const plan = await generatePlan(baseTriage);
    const day1 = plan.days[0];

    let updated;
    for (const task of day1.tasks) {
      updated = await toggleTask(1, task.id);
    }

    expect(updated.completedDays).toContain(1);
  });

  it("returns null for invalid day or task", async () => {
    await generatePlan(baseTriage);
    const result = await toggleTask(99, "nonexistent");
    expect(result).toBeNull();
  });
});

describe("getCurrentPlanDay", () => {
  it("returns 1 on day of creation", async () => {
    const plan = await generatePlan(baseTriage);
    const day = getCurrentPlanDay(plan);
    expect(day).toBe(1);
  });

  it("clamps to 7 for dates beyond plan", async () => {
    const plan = await generatePlan(baseTriage);
    // Simulate 10 days ago
    plan.startDate = Date.now() - 10 * 24 * 60 * 60 * 1000;
    const day = getCurrentPlanDay(plan);
    expect(day).toBe(7);
  });
});

describe("isPlanActive / isPlanComplete", () => {
  it("plan is active during first 7 days", async () => {
    const plan = await generatePlan(baseTriage);
    expect(isPlanActive(plan)).toBe(true);
    expect(isPlanComplete(plan)).toBe(false);
  });

  it("plan is complete after 7 days", async () => {
    const plan = await generatePlan(baseTriage);
    plan.startDate = Date.now() - 8 * 24 * 60 * 60 * 1000;
    expect(isPlanComplete(plan)).toBe(true);
  });

  it("plan is complete when all 7 days marked", async () => {
    const plan = await generatePlan(baseTriage);
    plan.completedDays = [1, 2, 3, 4, 5, 6, 7];
    expect(isPlanComplete(plan)).toBe(true);
  });
});

describe("getDay7Summary", () => {
  it("returns summary with adherence stats", async () => {
    const plan = await generatePlan(baseTriage);

    // Complete some tasks
    for (const task of plan.days[0].tasks) {
      await toggleTask(1, task.id);
    }

    const summary = await getDay7Summary();
    expect(summary).toBeDefined();
    expect(summary.totalTasksCompleted).toBeGreaterThan(0);
    expect(summary.totalTasks).toBeGreaterThan(0);
    expect(summary.adherencePercent).toBeGreaterThan(0);
    expect(summary.daysCompleted).toBe(1);
    expect(summary.topPatterns.length).toBeGreaterThan(0);
    expect(summary.recommendedNextStep).toBeTruthy();
  });

  it("returns null when no plan exists", async () => {
    const summary = await getDay7Summary();
    expect(summary).toBeNull();
  });
});

describe("static data", () => {
  it("FEAR_FOOD_OPTIONS has at least 10 options", () => {
    expect(FEAR_FOOD_OPTIONS.length).toBeGreaterThanOrEqual(10);
  });

  it("MEAL_TIME_OPTIONS has 4 options", () => {
    expect(MEAL_TIME_OPTIONS).toHaveLength(4);
  });

  it("MEDS_OPTIONS has 4 options", () => {
    expect(MEDS_OPTIONS).toHaveLength(4);
  });
});

describe("persistence", () => {
  it("saves and loads plan correctly", async () => {
    const plan = await generatePlan(baseTriage);
    const loaded = await getOnboardingPlan();
    expect(loaded.id).toEqual(plan.id);
    expect(loaded.triage).toEqual(plan.triage);
  });

  it("clearOnboardingPlan removes stored plan", async () => {
    await generatePlan(baseTriage);
    await clearOnboardingPlan();
    const loaded = await getOnboardingPlan();
    expect(loaded).toBeNull();
  });
});
