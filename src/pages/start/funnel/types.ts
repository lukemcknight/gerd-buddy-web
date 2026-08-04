export type StepType = "interstitial" | "select" | "multi" | "slider" | "text" | "stat" | "plan" | "account" | "paywall" | "success";

export interface FunnelStep {
  id: string;
  phase: string;
  type: StepType;
  title: string;
  subtitle?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  unit?: string;
  cta?: string;
  autoAdvanceMs?: number;
}

export type Answers = Record<string, string | string[] | number>;
