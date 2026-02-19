import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "../services/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If Firebase is not configured, skip auth state listener
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        setUser(firebaseUser);
        setLoading(false);
      },
      (err) => {
        console.warn("Auth state change error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const signUp = async (email, password) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error("Firebase is not configured");
    }
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      return userCredential.user;
    } catch (err) {
      const message = getFirebaseErrorMessage(err.code);
      setError(message);
      throw new Error(message);
    }
  };

  const signIn = async (email, password) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error("Firebase is not configured");
    }
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      return userCredential.user;
    } catch (err) {
      const message = getFirebaseErrorMessage(err.code);
      setError(message);
      throw new Error(message);
    }
  };

  const signOut = async () => {
    if (!isFirebaseConfigured || !auth) {
      return;
    }
    setError(null);
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      const message = getFirebaseErrorMessage(err.code);
      setError(message);
      throw new Error(message);
    }
  };

  const clearError = () => setError(null);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isFirebaseConfigured,
    signUp,
    signIn,
    signOut,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Helper to convert Firebase error codes to user-friendly messages
function getFirebaseErrorMessage(errorCode) {
  switch (errorCode) {
    case "auth/email-already-in-use":
      return "This email is already registered. Try signing in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled. Please contact support.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/user-not-found":
      return "No account found with this email. Try signing up instead.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/invalid-credential":
      return "Invalid email or password. Please try again.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection.";
    default:
      return "An error occurred. Please try again.";
  }
}

export default AuthContext;
