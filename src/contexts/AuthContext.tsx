import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  // Resolve to the signed-in user's Firebase uid (not void): callers use it
  // to identify the person to analytics (see AccountStep's identifyUser
  // call), so web-funnel persons stitch to the same person the mobile app
  // identifies with.
  signUp: (email: string, password: string, displayName?: string) => Promise<string>;
  signIn: (email: string, password: string) => Promise<string>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerification: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    // Guard: skip the profile write entirely when no real name was collected,
    // so no placeholder value ever lands on the account record.
    if (displayName) {
      await updateProfile(user, { displayName });
    }
    return user.uid;
  };

  const signIn = async (email: string, password: string) => {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    return user.uid;
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const sendVerification = async () => {
    if (!auth.currentUser) {
      throw new Error("You must be signed in to send a verification email.");
    }
    await sendEmailVerification(auth.currentUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, resetPassword, sendVerification }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
