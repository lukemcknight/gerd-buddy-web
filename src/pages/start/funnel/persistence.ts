import type { Answers } from "./types";
import { STEP_IDS } from "./steps";

const KEY = "gb_funnel_v1";
const CURRENT_VERSION = 2;

export type Persisted = { stepIndex: number; answers: Answers };

const clampIndex = (index: number): number =>
  Math.max(0, Math.min(index, STEP_IDS.length - 1));

/**
 * Resolves a persisted step reference back to a current FUNNEL_STEPS index.
 * Prefers the id-based reference (`stepId`), which is stable across a
 * future reorder of FUNNEL_STEPS. Falls back to the raw numeric
 * `stepIndex` (clamped into range) when `stepId` is missing (a legacy v1
 * payload) or no longer resolves to any current step (an id a later
 * reorder/removal dropped). Returns null when neither is usable.
 */
const resolveIndex = (payload: { stepId?: unknown; stepIndex?: unknown }): number | null => {
  if (typeof payload.stepId === "string") {
    const idx = STEP_IDS.indexOf(payload.stepId);
    if (idx !== -1) return idx;
  }
  if (typeof payload.stepIndex === "number") {
    return clampIndex(payload.stepIndex);
  }
  return null;
};

export const save = (state: Persisted) => {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        v: CURRENT_VERSION,
        stepId: STEP_IDS[state.stepIndex],
        stepIndex: state.stepIndex,
        answers: state.answers,
      })
    );
  } catch {
    /* storage full/blocked: resume is best-effort */
  }
};

export const load = (): Persisted | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object") return null;

    // v2: id-based resume (current format). v1: legacy migration path --
    // no stepId was ever written, so this always falls through to the
    // clamped-numeric-index branch of resolveIndex.
    if (p.v !== CURRENT_VERSION && p.v !== 1) return null;

    const stepIndex = resolveIndex(p);
    if (stepIndex === null) return null;

    return { stepIndex, answers: p.answers ?? {} };
  } catch {
    return null;
  }
};
