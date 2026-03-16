import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Types ──────────────────────────────────────────────────────────────

export type SeverityLevel = "light" | "moderate" | "severe";
export type MedsStatus = "none" | "ppi" | "h2" | "other";

export type TriageAnswers = {
  conditions?: string[]; // ["gerd"], ["gastritis"], or ["gerd", "gastritis"]
  severity: SeverityLevel;
  fearFoods: string[];
  customFearFoods: string[];
  mealTimes: string[]; // e.g. ["breakfast", "lunch", "dinner", "snack"]
  medsStatus: MedsStatus;
};

export type PlanTask = {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: number;
};

export type PlanDay = {
  day: number; // 1-7
  focus: string;
  tasks: PlanTask[];
};

export type OnboardingPlan = {
  id: string;
  createdAt: number;
  startDate: number; // midnight of day 1 in local tz
  triage: TriageAnswers;
  days: PlanDay[];
  completedDays: number[];
  timezone: string;
};

export type Day7Summary = {
  totalTasksCompleted: number;
  totalTasks: number;
  adherencePercent: number;
  daysCompleted: number;
  topPatterns: string[];
  recommendedNextStep: string;
};

// ── Storage ────────────────────────────────────────────────────────────

const PLAN_KEY = "gerdbuddy_onboarding_plan";

export const getOnboardingPlan = async (): Promise<OnboardingPlan | null> => {
  try {
    const value = await AsyncStorage.getItem(PLAN_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

export const saveOnboardingPlan = async (plan: OnboardingPlan): Promise<void> => {
  await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(plan));
};

export const clearOnboardingPlan = async (): Promise<void> => {
  await AsyncStorage.removeItem(PLAN_KEY);
};

// ── Timezone-aware day calculation ─────────────────────────────────────

const getLocalMidnight = (date: Date = new Date()): number => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export const getCurrentPlanDay = (plan: OnboardingPlan): number => {
  const todayMidnight = getLocalMidnight();
  const diffMs = todayMidnight - plan.startDate;
  const dayIndex = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
  return Math.max(1, Math.min(7, dayIndex));
};

export const isPlanActive = (plan: OnboardingPlan): boolean => {
  const currentDay = getCurrentPlanDay(plan);
  return currentDay >= 1 && currentDay <= 7;
};

export const isPlanComplete = (plan: OnboardingPlan): boolean => {
  // Check if we're past day 7 (before clamping)
  const todayMidnight = getLocalMidnight();
  const diffMs = todayMidnight - plan.startDate;
  const rawDay = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
  return rawDay > 7 || plan.completedDays.length >= 7;
};

// ── Fear food options ──────────────────────────────────────────────────

export const GERD_FEAR_FOOD_OPTIONS = [
  { id: "tomato", label: "Tomatoes / tomato sauce" },
  { id: "coffee", label: "Coffee" },
  { id: "chocolate", label: "Chocolate" },
  { id: "citrus", label: "Citrus fruits" },
  { id: "spicy", label: "Spicy foods" },
  { id: "fried", label: "Fried / greasy foods" },
  { id: "dairy", label: "Dairy products" },
  { id: "carbonated", label: "Carbonated drinks" },
  { id: "alcohol", label: "Alcohol" },
  { id: "mint", label: "Mint / peppermint" },
  { id: "onion_garlic", label: "Onions / garlic" },
  { id: "fatty_meats", label: "Fatty meats" },
];

export const GASTRITIS_FEAR_FOOD_OPTIONS = [
  { id: "spicy", label: "Spicy foods" },
  { id: "alcohol", label: "Alcohol" },
  { id: "coffee", label: "Coffee / caffeine" },
  { id: "fried", label: "Fried / greasy foods" },
  { id: "acidic", label: "Acidic foods (tomatoes, citrus)" },
  { id: "dairy", label: "Dairy products" },
  { id: "processed", label: "Processed / packaged foods" },
  { id: "red_meat", label: "Red meat" },
  { id: "carbonated", label: "Carbonated drinks" },
  { id: "onion_garlic", label: "Onions / garlic" },
  { id: "nsaids", label: "NSAIDs (ibuprofen, aspirin)" },
  { id: "heavy_meals", label: "Large / heavy meals" },
];

export const BOTH_FEAR_FOOD_OPTIONS = [
  { id: "spicy", label: "Spicy foods" },
  { id: "coffee", label: "Coffee / caffeine" },
  { id: "alcohol", label: "Alcohol" },
  { id: "fried", label: "Fried / greasy foods" },
  { id: "tomato", label: "Tomatoes / tomato sauce" },
  { id: "citrus", label: "Citrus fruits" },
  { id: "chocolate", label: "Chocolate" },
  { id: "dairy", label: "Dairy products" },
  { id: "carbonated", label: "Carbonated drinks" },
  { id: "onion_garlic", label: "Onions / garlic" },
  { id: "processed", label: "Processed / packaged foods" },
  { id: "mint", label: "Mint / peppermint" },
  { id: "heavy_meals", label: "Large / heavy meals" },
];

/** @deprecated Use condition-specific options instead */
export const FEAR_FOOD_OPTIONS = GERD_FEAR_FOOD_OPTIONS;

export const getFearFoodOptions = (conditions: string[] = ["gerd"]) => {
  const hasGerd = conditions.includes("gerd");
  const hasGastritis = conditions.includes("gastritis");
  if (hasGerd && hasGastritis) return BOTH_FEAR_FOOD_OPTIONS;
  if (hasGastritis) return GASTRITIS_FEAR_FOOD_OPTIONS;
  return GERD_FEAR_FOOD_OPTIONS;
};

export const MEAL_TIME_OPTIONS = [
  { id: "breakfast", label: "Breakfast (~7-9 AM)" },
  { id: "lunch", label: "Lunch (~12-1 PM)" },
  { id: "dinner", label: "Dinner (~6-7 PM)" },
  { id: "snack", label: "Snacks between meals" },
];

export const MEDS_OPTIONS: { id: MedsStatus; label: string }[] = [
  { id: "none", label: "No medication" },
  { id: "ppi", label: "PPI (e.g. omeprazole)" },
  { id: "h2", label: "H2 blocker (e.g. famotidine)" },
  { id: "other", label: "Other medication" },
];

// ── Plan generation ────────────────────────────────────────────────────

const generateTaskId = (day: number, index: number) =>
  `d${day}_t${index}_${Date.now()}`;

const buildDayTasks = (
  day: number,
  triage: TriageAnswers
): { focus: string; tasks: PlanTask[] } => {
  const isSevere = triage.severity === "severe";
  const isModerate = triage.severity === "moderate";
  const hasFearFoods = triage.fearFoods.length > 0 || triage.customFearFoods.length > 0;
  const onMeds = triage.medsStatus !== "none";
  const conditions = triage.conditions || ["gerd"];
  const hasGerd = conditions.includes("gerd");
  const hasGastritis = conditions.includes("gastritis");
  const gastritisOnly = hasGastritis && !hasGerd;

  const plans: Record<number, { focus: string; tasks: string[] }> = {
    1: {
      focus: "Start tracking your baseline",
      tasks: [
        "Log every meal today (aim for at least 2)",
        "Note how you feel 1-2 hours after each meal",
        ...(isSevere ? ["Avoid your top fear food today"] : []),
        ...(gastritisOnly
          ? ["Try eating smaller, more frequent meals today"]
          : ["Set a bedtime eating cutoff (3 hours before bed)"]),
      ],
    },
    2: {
      focus: "Identify your eating patterns",
      tasks: [
        "Log all meals and any symptoms",
        "Eat smaller portions at dinner",
        ...(gastritisOnly
          ? ["Notice if stress affects your symptoms today"]
          : ["Try not to lie down within 2 hours of eating"]),
        ...(onMeds ? ["Take medication at the same time today"] : []),
      ],
    },
    3: {
      focus: "Test a fear food safely",
      tasks: [
        "Log all meals and symptoms",
        ...(hasFearFoods
          ? ["Have a small portion of one fear food and track the result"]
          : ["Try a new meal and track how you feel"]),
        "Drink water between meals instead of with meals",
        "Note any stress or anxiety levels today",
      ],
    },
    4: {
      focus: "Focus on safe choices",
      tasks: [
        "Log all meals and symptoms",
        "Choose meals you know are safe for you",
        "Eat slowly — aim for 20+ minutes per meal",
        ...(gastritisOnly
          ? (isModerate || isSevere ? ["Try a bland, gentle meal for dinner tonight"] : [])
          : (isModerate || isSevere ? ["Elevate your head while sleeping tonight"] : [])),
      ],
    },
    5: {
      focus: "Review your first patterns",
      tasks: [
        "Log all meals and symptoms",
        "Check your Insights tab for emerging patterns",
        "Scan a meal with Food Scanner to learn more",
        "Try a lighter dinner tonight",
      ],
    },
    6: {
      focus: "Build consistency",
      tasks: [
        "Log all meals and symptoms",
        "Stick to your eating schedule today",
        ...(hasFearFoods
          ? ["Test another fear food in a small amount"]
          : ["Try a new safe recipe"]),
        "Note what time symptoms are worst (if any)",
      ],
    },
    7: {
      focus: "Reflect and plan ahead",
      tasks: [
        "Log all meals and symptoms",
        "Review your full week in the Insights tab",
        "Identify your top 2-3 patterns from the week",
        "Set a goal for next week based on what you learned",
      ],
    },
  };

  const dayPlan = plans[day] || plans[1];

  return {
    focus: dayPlan.focus,
    tasks: dayPlan.tasks.map((text, idx) => ({
      id: generateTaskId(day, idx),
      text,
      completed: false,
    })),
  };
};

export const generatePlan = async (
  triage: TriageAnswers
): Promise<OnboardingPlan> => {
  // Idempotent: don't regenerate if a plan already exists
  const existing = await getOnboardingPlan();
  if (existing) return existing;

  const now = new Date();
  const startDate = getLocalMidnight(now);

  const days: PlanDay[] = [];
  for (let day = 1; day <= 7; day++) {
    const { focus, tasks } = buildDayTasks(day, triage);
    days.push({ day, focus, tasks });
  }

  const plan: OnboardingPlan = {
    id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    startDate,
    triage,
    days,
    completedDays: [],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  await saveOnboardingPlan(plan);
  return plan;
};

// ── Task completion ────────────────────────────────────────────────────

export const toggleTask = async (
  dayNumber: number,
  taskId: string
): Promise<OnboardingPlan | null> => {
  const plan = await getOnboardingPlan();
  if (!plan) return null;

  const day = plan.days.find((d) => d.day === dayNumber);
  if (!day) return null;

  const task = day.tasks.find((t) => t.id === taskId);
  if (!task) return null;

  task.completed = !task.completed;
  task.completedAt = task.completed ? Date.now() : undefined;

  // Check if all tasks for this day are complete
  const allComplete = day.tasks.every((t) => t.completed);
  if (allComplete && !plan.completedDays.includes(dayNumber)) {
    plan.completedDays.push(dayNumber);
  } else if (!allComplete && plan.completedDays.includes(dayNumber)) {
    plan.completedDays = plan.completedDays.filter((d) => d !== dayNumber);
  }

  await saveOnboardingPlan(plan);
  return plan;
};

// ── Day 7 summary ─────────────────────────────────────────────────────

export const getDay7Summary = async (): Promise<Day7Summary | null> => {
  const plan = await getOnboardingPlan();
  if (!plan) return null;

  let totalCompleted = 0;
  let totalTasks = 0;

  for (const day of plan.days) {
    totalTasks += day.tasks.length;
    totalCompleted += day.tasks.filter((t) => t.completed).length;
  }

  const adherencePercent =
    totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  const topPatterns: string[] = [];
  const { triage } = plan;

  if (triage.severity === "severe") {
    topPatterns.push("You started with severe symptoms — tracking consistently is key.");
  }
  if (triage.fearFoods.length > 0) {
    topPatterns.push(
      `You identified ${triage.fearFoods.length} fear food${triage.fearFoods.length > 1 ? "s" : ""} to watch.`
    );
  }
  if (plan.completedDays.length >= 5) {
    topPatterns.push("Great consistency! You completed tasks on most days.");
  } else if (plan.completedDays.length >= 3) {
    topPatterns.push("Solid start — try to increase consistency next week.");
  } else {
    topPatterns.push("Room to grow — even small daily actions help find triggers.");
  }

  const recommendedNextStep =
    adherencePercent >= 70
      ? "Keep tracking and check your Insights tab for trigger patterns."
      : "Focus on logging meals consistently — patterns emerge with more data.";

  return {
    totalTasksCompleted: totalCompleted,
    totalTasks,
    adherencePercent,
    daysCompleted: plan.completedDays.length,
    topPatterns,
    recommendedNextStep,
  };
};
