import PostHog from "posthog-react-native";

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let posthogClient = null;

export const getPostHogClient = async () => {
  if (!posthogClient && POSTHOG_API_KEY) {
    posthogClient = await PostHog.initAsync(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
    });
  }
  return posthogClient;
};

export const trackEvent = async (event, properties = {}) => {
  const client = await getPostHogClient();
  client?.capture(event, properties);
};

export const identifyUser = async (userId, properties = {}) => {
  const client = await getPostHogClient();
  client?.identify(userId, properties);
};

export const trackScreen = async (screenName, properties = {}) => {
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
