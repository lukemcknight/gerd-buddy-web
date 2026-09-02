import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAppCheck } from "firebase-admin/app-check";

let appPromise: Promise<ReturnType<typeof initializeApp>> | null = null;

export class AppCheckConfigurationError extends Error {
  readonly cause: unknown;

  constructor(cause: unknown) {
    super("firebase_admin_not_configured");
    this.name = "AppCheckConfigurationError";
    this.cause = cause;
  }
}

const getAdminApp = async () => {
  if (!appPromise) {
    const initialization = Promise.resolve().then(() => {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (!raw) {
        throw new Error("firebase_admin_not_configured");
      }

      const serviceAccount = JSON.parse(raw);
      return getApps()[0] || initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
    });
    appPromise = initialization.catch((error) => {
      appPromise = null;
      throw new AppCheckConfigurationError(error);
    });
  }

  return appPromise;
};

export const verifyAppCheckToken = async (
  token: string
): Promise<{ app_id?: string }> => {
  const app = await getAdminApp();
  const verified = await getAppCheck(app).verifyToken(token);
  return { app_id: verified.token.app_id || verified.appId };
};
