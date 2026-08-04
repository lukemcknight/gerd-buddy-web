import React, { createContext, useContext, useReducer, useEffect, ReactNode } from "react";
import type { FunnelStep, Answers } from "./types";
import { FUNNEL_STEPS } from "./steps";
import { nextIndex, prevIndex, lossStats } from "./engine";
import { save, load } from "./persistence";
import { trackStep } from "./analytics";

interface FunnelContextValue {
  step: FunnelStep;
  index: number;
  total: number;
  answers: Answers;
  answer: (id: string, value: Answers[string]) => void;
  next: () => void;
  back: () => void;
  stats: { nightsPerYear: number; dollarsPerYear: number };
  displayName: string;
}

const FunnelCtx = createContext<FunnelContextValue | undefined>(undefined);

interface FunnelState {
  index: number;
  answers: Answers;
  hydrated: boolean;
}

type FunnelAction =
  | { type: "HYDRATE"; index: number; answers: Answers }
  | { type: "ANSWER"; id: string; value: Answers[string] }
  | { type: "NEXT" }
  | { type: "BACK" };

const initialState: FunnelState = {
  index: 0,
  answers: {},
  hydrated: false,
};

function funnelReducer(state: FunnelState, action: FunnelAction): FunnelState {
  switch (action.type) {
    case "HYDRATE":
      return {
        index: Math.max(0, Math.min(action.index, FUNNEL_STEPS.length - 1)),
        answers: action.answers,
        hydrated: true,
      };
    case "ANSWER":
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.id]: action.value,
        },
      };
    case "NEXT":
      return {
        ...state,
        index: nextIndex(FUNNEL_STEPS, state.index),
      };
    case "BACK":
      return {
        ...state,
        index: prevIndex(state.index),
      };
    default:
      return state;
  }
}

export function FunnelProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(funnelReducer, initialState);

  // Hydrate from persistence on mount
  useEffect(() => {
    const saved = load();
    if (saved) {
      dispatch({
        type: "HYDRATE",
        index: saved.stepIndex,
        answers: saved.answers,
      });
    } else {
      dispatch({
        type: "HYDRATE",
        index: 0,
        answers: {},
      });
    }
  }, []);

  // Save and track whenever index changes
  useEffect(() => {
    if (!state.hydrated) return;
    save({ stepIndex: state.index, answers: state.answers });
    trackStep(FUNNEL_STEPS[state.index], state.index);
  }, [state.index, state.hydrated]);

  const stats = lossStats(state.answers);
  const displayName =
    typeof state.answers.name === "string" && state.answers.name.trim()
      ? state.answers.name.trim()
      : "friend";

  const answer = (id: string, value: Answers[string]) => {
    dispatch({ type: "ANSWER", id, value });

    // Auto-advance for select steps
    const step = FUNNEL_STEPS[state.index];
    if (step && step.type === "select") {
      dispatch({ type: "NEXT" });
    }
  };

  const next = () => {
    dispatch({ type: "NEXT" });
  };

  const back = () => {
    dispatch({ type: "BACK" });
  };

  const value: FunnelContextValue = {
    step: FUNNEL_STEPS[state.index],
    index: state.index,
    total: FUNNEL_STEPS.length,
    answers: state.answers,
    answer,
    next,
    back,
    stats,
    displayName,
  };

  return <FunnelCtx.Provider value={value}>{children}</FunnelCtx.Provider>;
}

export function useFunnel(): FunnelContextValue {
  const ctx = useContext(FunnelCtx);
  if (!ctx) {
    throw new Error("useFunnel must be used within FunnelProvider");
  }
  return ctx;
}

/**
 * Renders a title string with template substitutions.
 * Replaces {name}, {nightsPerYear}, {dollarsPerYear}.
 */
export function renderTitle(
  text: string,
  ctx: { name?: string; nightsPerYear: number; dollarsPerYear: number }
): string {
  return text
    .replace("{name}", ctx.name || "")
    .replace("{nightsPerYear}", String(ctx.nightsPerYear))
    .replace("{dollarsPerYear}", String(ctx.dollarsPerYear));
}
