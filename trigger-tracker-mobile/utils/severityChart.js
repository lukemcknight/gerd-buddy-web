// Build a 7-day series of average symptom severity ending on `now` (today).
// Each entry covers a calendar day (local midnight to midnight) so a symptom
// logged at 11pm vs the next day at 1am don't fall in the same bucket.
//
// Severity values come from SeveritySlider (0-5). Days with no symptoms
// return avgSeverity: 0 and count: 0; the consumer decides how to render
// "no data" vs "0 severity logged" — these are different stories.

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const startOfDay = (ts) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export const getWeeklySeverity = (symptoms, now = Date.now()) => {
  const todayStart = startOfDay(now);
  const days = [];

  for (let offset = 6; offset >= 0; offset--) {
    const dayStart = todayStart - offset * 24 * 60 * 60 * 1000;
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    days.push({ dateMs: dayStart, dayEnd, severities: [] });
  }

  const list = Array.isArray(symptoms) ? symptoms : [];
  for (const symptom of list) {
    const ts = symptom?.timestamp ?? symptom?.createdAt;
    if (typeof ts !== "number") continue;
    const sev = Number(symptom?.severity);
    if (!Number.isFinite(sev)) continue;

    const day = days.find((d) => ts >= d.dateMs && ts < d.dayEnd);
    if (day) day.severities.push(sev);
  }

  return days.map((d) => {
    const count = d.severities.length;
    const avgSeverity = count
      ? d.severities.reduce((a, b) => a + b, 0) / count
      : 0;
    return {
      dateMs: d.dateMs,
      dayLabel: DAY_LABELS[new Date(d.dateMs).getDay()],
      avgSeverity,
      count,
    };
  });
};

export const SEVERITY_MAX = 5;
