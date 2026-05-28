const DAY_MS = 24 * 60 * 60 * 1000;

export const EVIDENCE_TARGETS = {
  days: 14,
  meals: 28,
  symptoms: 8,
  triggers: 4,
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const asArray = (value) => (Array.isArray(value) ? value : []);

const percent = (value, target) =>
  Math.round(clamp(value / target, 0, 1) * 100);

const countToward = (items, target) => {
  const count = asArray(items).length;
  return {
    count,
    progress: Math.min(count, target),
    percent: percent(count, target),
  };
};

const getStartDate = (user, now) => {
  const candidate = Number(user?.startDate || user?.createdAt);
  return Number.isFinite(candidate) && candidate > 0 ? candidate : now;
};

export const calculateEvidenceProgress = ({
  user = null,
  meals = [],
  symptoms = [],
  triggers = [],
  now = Date.now(),
} = {}) => {
  const startDate = getStartDate(user, now);
  const elapsedDays = Math.floor(Math.max(0, now - startDate) / DAY_MS) + 1;
  const dayProgress = clamp(elapsedDays, 1, EVIDENCE_TARGETS.days);
  const dayPercent = percent(dayProgress, EVIDENCE_TARGETS.days);

  const meal = countToward(meals, EVIDENCE_TARGETS.meals);
  const symptom = countToward(symptoms, EVIDENCE_TARGETS.symptoms);
  const trigger = countToward(triggers, EVIDENCE_TARGETS.triggers);

  const reportReadiness = Math.round(
    meal.percent * 0.3 +
      symptom.percent * 0.25 +
      trigger.percent * 0.2 +
      dayPercent * 0.25
  );

  return {
    targets: EVIDENCE_TARGETS,
    dayProgress,
    dayPercent,
    mealCount: meal.count,
    mealProgress: meal.progress,
    mealPercent: meal.percent,
    symptomCount: symptom.count,
    symptomProgress: symptom.progress,
    symptomPercent: symptom.percent,
    triggerCount: trigger.count,
    triggerProgress: trigger.progress,
    triggerPercent: trigger.percent,
    reportReadiness: clamp(reportReadiness, 0, 100),
  };
};

export default calculateEvidenceProgress;
