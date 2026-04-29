const { getWeeklySeverity } = require("../severityChart");

const DAY_MS = 24 * 60 * 60 * 1000;

// Pin "now" to a known instant so day-boundary math is deterministic
// regardless of when tests run. 2026-04-29 12:00 local time (Wednesday).
const NOW = new Date(2026, 3, 29, 12, 0, 0, 0).getTime();

const startOfDay = (ts) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

describe("getWeeklySeverity", () => {
  it("returns 7 entries", () => {
    const result = getWeeklySeverity([], NOW);
    expect(result).toHaveLength(7);
  });

  it("ends on today (last entry is today's start-of-day)", () => {
    const result = getWeeklySeverity([], NOW);
    expect(result[6].dateMs).toBe(startOfDay(NOW));
  });

  it("starts 6 days before today (first entry is 6 days back)", () => {
    const result = getWeeklySeverity([], NOW);
    expect(result[0].dateMs).toBe(startOfDay(NOW) - 6 * DAY_MS);
  });

  it("returns 0 avgSeverity and count=0 for days with no symptoms", () => {
    const result = getWeeklySeverity([], NOW);
    result.forEach((day) => {
      expect(day.avgSeverity).toBe(0);
      expect(day.count).toBe(0);
    });
  });

  it("averages severities for symptoms within a single day", () => {
    const todayMidday = startOfDay(NOW) + 12 * 60 * 60 * 1000;
    const symptoms = [
      { timestamp: todayMidday, severity: 2 },
      { timestamp: todayMidday + 1000, severity: 4 },
    ];
    const result = getWeeklySeverity(symptoms, NOW);
    expect(result[6].count).toBe(2);
    expect(result[6].avgSeverity).toBe(3);
  });

  it("buckets symptoms into the correct day by local-midnight boundary", () => {
    const yesterdayLate = startOfDay(NOW) - 1; // 23:59:59 yesterday
    const todayEarly = startOfDay(NOW) + 1; // 00:00:00 today

    const result = getWeeklySeverity(
      [
        { timestamp: yesterdayLate, severity: 5 },
        { timestamp: todayEarly, severity: 1 },
      ],
      NOW
    );

    expect(result[5].count).toBe(1); // yesterday
    expect(result[5].avgSeverity).toBe(5);
    expect(result[6].count).toBe(1); // today
    expect(result[6].avgSeverity).toBe(1);
  });

  it("ignores symptoms outside the 7-day window", () => {
    const eightDaysAgo = startOfDay(NOW) - 8 * DAY_MS;
    const result = getWeeklySeverity(
      [{ timestamp: eightDaysAgo, severity: 5 }],
      NOW
    );
    result.forEach((day) => expect(day.count).toBe(0));
  });

  it("ignores symptoms missing severity or timestamp", () => {
    const todayMidday = startOfDay(NOW) + 12 * 60 * 60 * 1000;
    const result = getWeeklySeverity(
      [
        { timestamp: todayMidday }, // no severity
        { severity: 3 }, // no timestamp
        { timestamp: todayMidday, severity: "bad" }, // non-numeric severity
      ],
      NOW
    );
    expect(result[6].count).toBe(0);
  });

  it("falls back to createdAt when timestamp is missing", () => {
    const todayMidday = startOfDay(NOW) + 12 * 60 * 60 * 1000;
    const result = getWeeklySeverity(
      [{ createdAt: todayMidday, severity: 4 }],
      NOW
    );
    expect(result[6].count).toBe(1);
    expect(result[6].avgSeverity).toBe(4);
  });

  it("returns single-letter day labels (S/M/T/W/T/F/S)", () => {
    const result = getWeeklySeverity([], NOW);
    result.forEach((day) =>
      expect(["S", "M", "T", "W", "F"]).toContain(day.dayLabel)
    );
  });

  it("handles non-array symptoms input gracefully", () => {
    expect(() => getWeeklySeverity(null, NOW)).not.toThrow();
    expect(() => getWeeklySeverity(undefined, NOW)).not.toThrow();
    const result = getWeeklySeverity(null, NOW);
    expect(result).toHaveLength(7);
  });
});
