import type { Answers } from "./types";

const KEY = "gb_funnel_v1";
type Persisted = { stepIndex: number; answers: Answers };

export const save = (state: Persisted) => {
  try { localStorage.setItem(KEY, JSON.stringify({ v: 1, ...state })); } catch { /* storage full/blocked: resume is best-effort */ }
};

export const load = (): Persisted | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p?.v !== 1 || typeof p.stepIndex !== "number") return null;
    return { stepIndex: p.stepIndex, answers: p.answers ?? {} };
  } catch { return null; }
};
