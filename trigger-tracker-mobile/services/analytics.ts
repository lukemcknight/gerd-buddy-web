import PostHog from "posthog-react-native";

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let posthogClient: any = null;

export const getPostHogClient = async () => {
  if (!posthogClient && POSTHOG_API_KEY) {
    posthogClient = await PostHog.initAsync(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
    });
  }
  return posthogClient;
};

export const trackEvent = async (event: string, properties: Record<string, any> = {}) => {
  const client = await getPostHogClient();
  client?.capture(event, properties);
};

export const identifyUser = async (userId: string, properties: Record<string, any> = {}) => {
  const client = await getPostHogClient();
  client?.identify(userId, properties);
};

export const trackScreen = async (screenName: string, properties: Record<string, any> = {}) => {
  const client = await getPostHogClient();
  client?.screen(screenName, properties);
};

export const resetUser = async () => {
  const client = await getPostHogClient();
  client?.reset();
};

export const POSTHOG_CONFIG = {
  apiKey: POSTHOG_API_KEY,
  host: POSTHOG_HOST,
};

// ── Analytics event constants ──────────────────────────────────────────

export const EVENTS = {
  // Onboarding
  ONBOARDING_TRIAGE_STARTED: "onboarding_triage_started",
  ONBOARDING_TRIAGE_COMPLETED: "onboarding_triage_completed",
  ONBOARDING_PLAN_GENERATED: "onboarding_plan_generated",
  ONBOARDING_DAY_COMPLETED: "onboarding_day_completed",
  ONBOARDING_DAY7_SUMMARY_VIEWED: "onboarding_day7_summary_viewed",

  // Scanner
  SCANNER_ATTEMPTED: "scanner_attempted",
  SCANNER_ALLOWED: "scanner_allowed",
  SCANNER_BLOCKED_LIMIT_REACHED: "scanner_blocked_limit_reached",
  SCANNER_RESULT_VIEWED: "scanner_result_viewed",
  SCANNER_REASON_TAG_EXPANDED: "scanner_reason_tag_expanded",
  SCANNER_SWAP_TAPPED: "scanner_swap_tapped",

  // Paywall
  PAYWALL_TRIGGERED: "paywall_triggered",
  PAYWALL_VIEWED: "paywall_viewed",
  TRIAL_STARTED: "trial_started",
  PURCHASE_COMPLETED: "purchase_completed",
  PURCHASE_RESTORED: "purchase_restored",
} as const;

export type AnalyticsProperties = {
  user_tenure_days?: number;
  scan_count_7d?: number;
  onboarding_day?: number;
  trigger_source?: string;
  result_label?: string;
  has_swaps?: boolean;
  entitlement_state?: string;
  severity_level?: string;
  fear_foods_count?: number;
  meds_status?: string;
  plan_adherence?: number;
  tasks_completed?: number;
  tasks_total?: number;
  reason_tag?: string;
  swap_item?: string;
  [key: string]: any;
};

export const trackAnalyticsEvent = async (
  event: string,
  properties: AnalyticsProperties = {}
) => {
  return trackEvent(event, properties);
};
