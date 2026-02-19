import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Firebase Configuration
 *
 * To set up Firebase:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project (or use existing)
 * 3. Add an iOS app with your bundle identifier
 * 4. Go to Project Settings > General > Your apps
 * 5. Copy the Firebase config values
 * 6. Add them to your .env.development and .env.production files:
 *
 *    EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
 *    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
 *    EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
 *    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
 *    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
 *    EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
 *
 * 7. Enable Email/Password authentication in Firebase Console:
 *    Authentication > Sign-in method > Email/Password > Enable
 */

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Check if Firebase is configured
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

let app = null;
let auth = null;

if (isFirebaseConfigured) {
  // Initialize Firebase only if not already initialized
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    // Use AsyncStorage for auth persistence in React Native
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } else {
    app = getApps()[0];
    auth = getAuth(app);
  }
}

export { app, auth };
export default app;
