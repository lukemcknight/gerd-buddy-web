const {
  getLevel,
  getLevelProgress,
  MOODS,
  getMood,
  ALL_ACCESSORIES,
  getEarnedAccessories,
  getNextAccessory,
  getSpeechMessage,
  computeBuddyState,
} = require("../buddyState");

describe("getLevel", () => {
  it("returns level 1 for 0 meals", () => {
    expect(getLevel(0)).toBe(1);
  });

  it("returns level 2 for 3 meals", () => {
    expect(getLevel(3)).toBe(2);
  });

  it("returns level 3 for 7 meals", () => {
    expect(getLevel(7)).toBe(3);
  });

  it("returns max level for 100+ meals", () => {
    expect(getLevel(100)).toBe(10);
    expect(getLevel(200)).toBe(10);
  });

  it("handles boundary values correctly", () => {
    expect(getLevel(2)).toBe(1);
    expect(getLevel(3)).toBe(2);
    expect(getLevel(6)).toBe(2);
    expect(getLevel(7)).toBe(3);
  });
});

describe("getLevelProgress", () => {
  it("returns correct XP for level 1", () => {
    const progress = getLevelProgress(2);
    expect(progress.level).toBe(1);
    expect(progress.currentXP).toBe(2);
    expect(progress.maxXP).toBe(3);
    expect(progress.percent).toBeCloseTo(66.67, 0);
  });

  it("returns 100% at max level", () => {
    const progress = getLevelProgress(150);
    expect(progress.level).toBe(10);
    expect(progress.percent).toBe(100);
  });
});

describe("getMood", () => {
  it("returns excited for 3+ streak and logged today", () => {
    const mood = getMood({ loggedToday: true, currentStreak: 3, daysSinceLastLog: 0 });
    expect(mood.id).toBe("excited");
  });

  it("returns happy for logged today", () => {
    const mood = getMood({ loggedToday: true, currentStreak: 1, daysSinceLastLog: 0 });
    expect(mood.id).toBe("happy");
  });

  it("returns content for recent logging", () => {
    const mood = getMood({ loggedToday: false, currentStreak: 0, daysSinceLastLog: 1 });
    expect(mood.id).toBe("content");
  });

  it("returns sad for no recent logging", () => {
    const mood = getMood({ loggedToday: false, currentStreak: 0, daysSinceLastLog: 3 });
    expect(mood.id).toBe("sad");
  });
});

describe("getEarnedAccessories", () => {
  it("returns empty for no activity", () => {
    const earned = getEarnedAccessories({ totalMeals: 0, bestStreak: 0 });
    expect(earned).toEqual([]);
  });

  it("earns party hat at 3-day streak", () => {
    const earned = getEarnedAccessories({ totalMeals: 0, bestStreak: 3 });
    expect(earned.map((a) => a.id)).toContain("party_hat");
  });

  it("earns scarf at 10 meals", () => {
    const earned = getEarnedAccessories({ totalMeals: 10, bestStreak: 0 });
    expect(earned.map((a) => a.id)).toContain("scarf");
  });

  it("earns multiple accessories", () => {
    const earned = getEarnedAccessories({ totalMeals: 50, bestStreak: 14 });
    const ids = earned.map((a) => a.id);
    expect(ids).toContain("scarf");
    expect(ids).toContain("backpack");
    expect(ids).toContain("star_badge");
    expect(ids).toContain("party_hat");
    expect(ids).toContain("sunglasses");
    expect(ids).toContain("cape");
  });
});

describe("getNextAccessory", () => {
  it("returns first accessory for new user", () => {
    const next = getNextAccessory({ totalMeals: 0, bestStreak: 0 });
    expect(next).toBeTruthy();
    expect(next.id).toBe("party_hat");
  });

  it("returns null when all earned", () => {
    const next = getNextAccessory({ totalMeals: 100, bestStreak: 30 });
    expect(next).toBeNull();
  });
});

describe("getSpeechMessage", () => {
  it("returns a string for each mood", () => {
    Object.values(MOODS).forEach((mood) => {
      const message = getSpeechMessage(mood);
      expect(typeof message).toBe("string");
      expect(message.length).toBeGreaterThan(0);
    });
  });
});

describe("computeBuddyState", () => {
  it("returns complete state object", () => {
    const state = computeBuddyState({
      totalMeals: 5,
      currentStreak: 2,
      bestStreak: 3,
      loggedToday: true,
    });

    expect(state.mood).toBeDefined();
    expect(state.mood.id).toBe("happy");
    expect(state.levelProgress).toBeDefined();
    expect(state.levelProgress.level).toBe(2);
    expect(state.earnedAccessories).toBeDefined();
    expect(state.message).toBeDefined();
    expect(state.totalMeals).toBe(5);
    expect(state.currentStreak).toBe(2);
  });

  it("returns excited mood for high streak", () => {
    const state = computeBuddyState({
      totalMeals: 20,
      currentStreak: 5,
      bestStreak: 5,
      loggedToday: true,
    });

    expect(state.mood.id).toBe("excited");
  });

  it("returns sad mood when not logged recently", () => {
    const state = computeBuddyState({
      totalMeals: 10,
      currentStreak: 0,
      bestStreak: 5,
      loggedToday: false,
    });

    expect(state.mood.id).toBe("sad");
  });
});
