import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAppCheck } from "firebase-admin/app-check";

let appPromise: Promise<ReturnType<typeof initializeApp>> | null = null;

const getAdminApp = async () => {
  if (!appPromise) {
    appPromise = Promise.resolve().then(() => {
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
