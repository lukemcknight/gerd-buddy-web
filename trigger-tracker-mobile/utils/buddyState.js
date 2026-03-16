/**
 * Buddy state engine — calculates the turtle's mood, level,
 * earned accessories, and speech bubble message based on user activity.
 *
 * NOTE: No emojis. All visual representations should be custom icons/images.
 */

// ── Levels (by total meals logged) ──────────────────────────────────
const LEVEL_THRESHOLDS = [0, 3, 7, 12, 20, 30, 45, 60, 80, 100];

export const getLevel = (totalMeals) => {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalMeals >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
};

export const getLevelProgress = (totalMeals) => {
  const level = getLevel(totalMeals);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? null;

  if (!nextThreshold) {
    // Max level
    return { level, currentXP: totalMeals, maxXP: totalMeals || 1, percent: 100 };
  }

  const currentXP = totalMeals - currentThreshold;
  const maxXP = nextThreshold - currentThreshold;
  const percent = Math.min((currentXP / maxXP) * 100, 100);

  return { level, currentXP, maxXP, percent };
};

// ── Moods ─────────────────────────────────────────────────────────────
export const MOODS = {
  excited: { id: "excited", color: "#f07c52" },
  happy: { id: "happy", color: "#3aa27f" },
  content: { id: "content", color: "#6b9080" },
  sad: { id: "sad", color: "#9ca3af" },
};

export const getMood = ({ loggedToday, currentStreak, daysSinceLastLog }) => {
  if (currentStreak >= 3 && loggedToday) return MOODS.excited;
  if (loggedToday) return MOODS.happy;
  if (daysSinceLastLog <= 1) return MOODS.content;
  return MOODS.sad;
};

// ── Accessories (earned at milestones) ────────────────────────────────
export const ALL_ACCESSORIES = [
  { id: "party_hat", label: "Party Hat", requirement: "3-day streak", check: (s) => s.bestStreak >= 3 },
  { id: "sunglasses", label: "Sunglasses", requirement: "7-day streak", check: (s) => s.bestStreak >= 7 },
  { id: "scarf", label: "Scarf", requirement: "10 meals logged", check: (s) => s.totalMeals >= 10 },
  { id: "cape", label: "Cape", requirement: "14-day streak", check: (s) => s.bestStreak >= 14 },
  { id: "backpack", label: "Backpack", requirement: "25 meals logged", check: (s) => s.totalMeals >= 25 },
  { id: "star_badge", label: "Star Badge", requirement: "50 meals logged", check: (s) => s.totalMeals >= 50 },
  { id: "crown", label: "Crown", requirement: "30-day streak", check: (s) => s.bestStreak >= 30 },
  { id: "golden_glow", label: "Golden Glow", requirement: "100 meals logged", check: (s) => s.totalMeals >= 100 },
];

export const getEarnedAccessories = ({ totalMeals, bestStreak }) => {
  const stats = { totalMeals, bestStreak };
  return ALL_ACCESSORIES.filter((a) => a.check(stats));
};

export const getNextAccessory = ({ totalMeals, bestStreak }) => {
  const stats = { totalMeals, bestStreak };
  return ALL_ACCESSORIES.find((a) => !a.check(stats)) || null;
};

// ── Speech bubble messages ────────────────────────────────────────────
const happyMessages = [
  "Great job logging today! Keep it up!",
  "You're building great habits!",
  "Your data is getting stronger every day!",
  "I'm learning your patterns — keep tracking!",
  "Another day, another step toward understanding your body!",
];

const excitedMessages = [
  "Amazing streak! You're on fire!",
  "Look at you go! Consistent tracking pays off!",
  "Your dedication is incredible!",
  "Streak champion! Patterns are getting clearer!",
];

const contentMessages = [
  "Hey! Ready to log today?",
  "Don't forget to track your meals today!",
  "I'm here whenever you're ready to log!",
  "Let's keep the streak going — log a meal!",
];

const sadMessages = [
  "I miss you! Let's get back to tracking.",
  "Ready to start again? I'm here for you.",
  "Every day is a fresh start — log a meal today!",
  "Your patterns need you! Let's track something.",
];

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const getSpeechMessage = (mood) => {
  switch (mood.id) {
    case "excited": return pickRandom(excitedMessages);
    case "happy": return pickRandom(happyMessages);
    case "content": return pickRandom(contentMessages);
    case "sad": return pickRandom(sadMessages);
    default: return pickRandom(contentMessages);
  }
};

// ── Full buddy state (call from HomeScreen) ───────────────────────────
export const computeBuddyState = ({ totalMeals, currentStreak, bestStreak, loggedToday }) => {
  const daysSinceLastLog = loggedToday ? 0 : currentStreak === 0 ? 2 : 1;
  const mood = getMood({ loggedToday, currentStreak, daysSinceLastLog });
  const levelProgress = getLevelProgress(totalMeals);
  const earnedAccessories = getEarnedAccessories({ totalMeals, bestStreak });
  const nextAccessory = getNextAccessory({ totalMeals, bestStreak });
  const message = getSpeechMessage(mood);

  return {
    mood,
    levelProgress,
    earnedAccessories,
    nextAccessory,
    message,
    totalMeals,
    currentStreak,
    bestStreak,
    loggedToday,
  };
};
