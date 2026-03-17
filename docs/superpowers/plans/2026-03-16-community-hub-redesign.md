# Community Hub Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform gerdbuddy.app from a promotional app landing page into a community resource hub with a lightweight discussion forum, Firebase auth, and a cleaner sober-tracker.com-inspired design.

**Architecture:** Keep the existing React SPA on Vite/Vercel. Add Firebase JS SDK for auth (email/password, shared with mobile app) and Firestore for forum data. Forum is client-rendered. Existing static pages (blog, privacy, terms) are restyled but keep their current rendering approach.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Firebase Auth, Cloud Firestore, React Router v6

**Spec:** `docs/superpowers/specs/2026-03-16-community-hub-redesign-design.md`

---

## File Structure

### New Files
```
src/lib/firebase.ts                    — Firebase app init + auth/firestore exports
src/contexts/AuthContext.tsx            — Auth state provider (user, loading, helpers)
src/pages/Login.tsx                     — Login page
src/pages/Register.tsx                  — Register page
src/pages/Profile.tsx                   — User profile (display name, member since, posts)
src/pages/Forum.tsx                     — Forum category listing
src/pages/ForumCategory.tsx             — Thread list for a category
src/pages/ForumThread.tsx               — Thread view with replies
src/pages/NewThread.tsx                 — Create new thread form
src/components/UserMenu.tsx             — Signed-in dropdown (Profile, Sign Out)
src/components/InitialAvatar.tsx        — Colored circle with user initials
src/components/ForumBreadcrumb.tsx      — Breadcrumb nav for forum pages
src/components/ThreadCard.tsx           — Thread preview card (used in lists)
src/components/ReplyCard.tsx            — Single reply display
src/components/ReplyForm.tsx            — Reply input form
src/components/VerificationBanner.tsx   — "Verify your email" banner
.env.example                           — Documents required VITE_FIREBASE_* vars
firestore.rules                        — Security rules for forum collections
firestore.indexes.json                 — Required composite indexes
```

### Modified Files
```
package.json                           — Add firebase dependency
src/App.tsx                             — Add AuthContext provider, new routes
src/components/Layout.tsx               — Wider layout, new nav items, footer redesign, UserMenu
src/pages/Index.tsx                     — Full homepage redesign (hero, 3 pillars, activity, FAQ)
src/pages/Blog.tsx                      — Card grid layout, wider container
src/pages/BlogPost.tsx                  — Wider layout, "discuss on forum" link, softer CTA
src/pages/Privacy.tsx                   — Wider layout with max-w-prose wrapper for readability
src/pages/Terms.tsx                     — Wider layout with max-w-prose wrapper for readability
src/index.css                           — Cleaner backgrounds, reduced gradients
tailwind.config.ts                      — Wider container max-width
src/config/site.ts                      — Add forum category constants
scripts/generate-sitemap.js             — Add static forum category routes
```

---

## Task 1: Firebase Setup & Auth Context

**Files:**
- Create: `.env.example`
- Create: `src/lib/firebase.ts`
- Create: `src/contexts/AuthContext.tsx`
- Modify: `package.json` (add firebase dep)
- Modify: `src/App.tsx` (wrap with AuthContext)

- [ ] **Step 1: Install Firebase SDK**

```bash
npm install firebase
```

- [ ] **Step 2: Create `.env.example`**

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

- [ ] **Step 3: Create `src/lib/firebase.ts`**

```typescript
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

- [ ] **Step 4: Create `src/contexts/AuthContext.tsx`**

Provides `user`, `loading`, `signUp`, `signIn`, `signOut`, `sendVerification`, `resetPassword` to the app. Uses `onAuthStateChanged` to track auth state. Exposes via `useAuth()` hook.

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendVerification: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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

  const signUp = async (email: string, password: string, displayName: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName });
    await sendEmailVerification(user);
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const sendVerification = async () => {
    if (auth.currentUser) await sendEmailVerification(auth.currentUser);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, sendVerification, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
```

- [ ] **Step 5: Wrap App with AuthProvider**

In `src/App.tsx`, import `AuthProvider` and wrap the `BrowserRouter` with it:

```tsx
<HelmetProvider>
  <AuthProvider>
    <BrowserRouter>
      ...
    </BrowserRouter>
  </AuthProvider>
</HelmetProvider>
```

- [ ] **Step 6: Verify the app builds**

```bash
npm run build
```

Expected: Build succeeds (Firebase SDK loaded but not yet called).

- [ ] **Step 7: Commit**

```bash
git add .env.example src/lib/firebase.ts src/contexts/AuthContext.tsx src/App.tsx package.json package-lock.json
git commit -m "feat: add Firebase setup and auth context"
```

---

## Task 2: Auth Pages (Login, Register, Profile)

**Files:**
- Create: `src/pages/Login.tsx`
- Create: `src/pages/Register.tsx`
- Create: `src/pages/Profile.tsx`
- Create: `src/components/InitialAvatar.tsx`
- Create: `src/components/VerificationBanner.tsx`
- Modify: `src/App.tsx` (add routes)

- [ ] **Step 1: Create `src/components/InitialAvatar.tsx`**

A colored circle showing the user's initials. Color is derived from the display name string (hash to pick from a fixed palette).

```tsx
const COLORS = [
  "bg-primary", "bg-accent", "bg-success", "bg-warning",
  "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-teal-500",
];

interface InitialAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
}

const InitialAvatar = ({ name, size = "md" }: InitialAvatarProps) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const colorIndex = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % COLORS.length;
  const sizeClasses = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-lg" };

  return (
    <div className={`${COLORS[colorIndex]} ${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-semibold`}>
      {initials}
    </div>
  );
};

export default InitialAvatar;
```

- [ ] **Step 2: Create `src/components/VerificationBanner.tsx`**

Shows a yellow banner if user is logged in but email is not verified. Includes a "Resend verification" button.

```tsx
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

const VerificationBanner = () => {
  const { user, sendVerification } = useAuth();
  const [sent, setSent] = useState(false);

  if (!user || user.emailVerified) return null;

  const handleResend = async () => {
    await sendVerification();
    setSent(true);
  };

  return (
    <div className="bg-warning/10 border-b border-warning/30 px-4 py-2 text-center text-sm">
      <span className="text-warning-foreground">
        Please verify your email to post in the forum.{" "}
      </span>
      {sent ? (
        <span className="font-medium text-warning">Verification email sent!</span>
      ) : (
        <button onClick={handleResend} className="font-medium text-primary hover:underline">
          Resend verification email
        </button>
      )}
    </div>
  );
};

export default VerificationBanner;
```

- [ ] **Step 3: Create `src/pages/Login.tsx`**

Simple email/password form. Uses `useAuth().signIn`. On success, navigate to previous page or home. Show error messages for invalid credentials. Link to Register page and password reset.

The form should use the existing shadcn/ui `Button`, `Input`, and `Label` components. Centered card layout at max-w-md.

Include:
- Email field
- Password field
- "Sign In" button
- "Forgot password?" link (calls `resetPassword`, shows success message)
- "Don't have an account? Sign up" link to `/register`
- Error display for auth failures

- [ ] **Step 4: Create `src/pages/Register.tsx`**

Email/password/display-name form. Uses `useAuth().signUp`. On success, navigate to home with verification banner showing.

Include:
- Display name field
- Email field
- Password field (min 6 chars)
- Confirm password field
- "Create Account" button
- "Already have an account? Sign in" link to `/login`
- Client-side validation (passwords match, min length)

- [ ] **Step 5: Create `src/pages/Profile.tsx`**

Shows the logged-in user's info. If not logged in, redirect to `/login`.

Include:
- InitialAvatar (large)
- Display name
- Email
- "Member since" date (from `user.metadata.creationTime`)
- Post count (placeholder — will connect to Firestore in Task 4)
- "My Posts" section (placeholder list — will connect in Task 4)

- [ ] **Step 6: Add routes to `src/App.tsx`**

Add lazy imports and routes for Login, Register, Profile:

```tsx
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Profile = lazy(() => import("./pages/Profile"));

// Inside Routes:
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />
<Route path="/profile" element={<Profile />} />
```

- [ ] **Step 7: Verify the app builds and routes work**

```bash
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add src/pages/Login.tsx src/pages/Register.tsx src/pages/Profile.tsx src/components/InitialAvatar.tsx src/components/VerificationBanner.tsx src/App.tsx
git commit -m "feat: add login, register, and profile pages with auth UI"
```

---

## Task 3: Layout Redesign (Nav, Footer, Width)

**Files:**
- Create: `src/components/UserMenu.tsx`
- Modify: `src/components/Layout.tsx`
- Modify: `tailwind.config.ts`
- Modify: `src/index.css`

- [ ] **Step 1: Update `tailwind.config.ts` container width**

Change the container `screens` from `480px` to `1200px`:

```typescript
container: {
  center: true,
  padding: "1rem",
  screens: {
    "2xl": "1200px",
  },
},
```

- [ ] **Step 2: Update `src/index.css` for cleaner background**

Replace the gradient surface background on body with a cleaner white/light-gray:

In `:root`, change:
```css
--gradient-surface: linear-gradient(180deg, hsl(0 0% 100%), hsl(150 10% 98%));
```

This gives a cleaner white-to-barely-tinted background instead of the current cream gradient.

- [ ] **Step 3: Create `src/components/UserMenu.tsx`**

A dropdown menu for signed-in users showing their name, with Profile and Sign Out options. Uses shadcn/ui `DropdownMenu`. For signed-out state, shows a "Sign In" link.

```tsx
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import InitialAvatar from "./InitialAvatar";
import { LogOut, User } from "lucide-react";

const UserMenu = () => {
  const { user, signOut } = useAuth();

  if (!user) {
    return (
      <Link
        to="/login"
        className="px-4 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Sign In
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 outline-none">
        <InitialAvatar name={user.displayName || "User"} size="sm" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to="/profile" className="flex items-center gap-2">
            <User className="w-4 h-4" /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => signOut()} className="flex items-center gap-2">
          <LogOut className="w-4 h-4" /> Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
```

- [ ] **Step 4: Rewrite `src/components/Layout.tsx`**

Key changes:
- Change all `max-w-3xl` to `max-w-screen-xl` (1280px, close to our 1200px target)
- Update `navLinks` to include Home, Blog, Forum, App
- Add `UserMenu` to the right side of the nav bar
- Add `VerificationBanner` below the nav
- Redesign footer to multi-column layout (Quick Links, Community, Legal, Contact)
- Keep sticky header with backdrop blur

Updated nav links:
```typescript
const navLinks = [
  { to: "/", label: "Home" },
  { to: "/blog", label: "Blog" },
  { to: "/forum", label: "Forum" },
];
```

Footer: 4-column grid on desktop, stacked on mobile:
- Column 1: GERDBuddy logo + tagline
- Column 2: Quick Links (Home, Blog, Forum)
- Column 3: Legal (Privacy, Terms)
- Column 4: Contact (email) + App Store link

Keep the medical disclaimer at the bottom.

- [ ] **Step 5: Verify the app builds and the wider layout renders**

```bash
npm run dev
```

Visually check: nav is wider, footer has columns, layout uses full width.

- [ ] **Step 6: Commit**

```bash
git add src/components/UserMenu.tsx src/components/Layout.tsx tailwind.config.ts src/index.css
git commit -m "feat: redesign layout with wider container, new nav, and multi-column footer"
```

---

## Task 4: Homepage Redesign

**Files:**
- Modify: `src/pages/Index.tsx`
- Modify: `src/config/site.ts` (add forum category data)

- [ ] **Step 1: Add forum category constants to `src/config/site.ts`**

```typescript
export const FORUM_CATEGORIES = [
  { slug: "food-and-triggers", name: "Food & Triggers", description: "What to eat, what to avoid, recipes" },
  { slug: "medication-and-treatment", name: "Medication & Treatment", description: "PPIs, H2 blockers, natural remedies" },
  { slug: "lifestyle-and-tips", name: "Lifestyle & Tips", description: "Sleep positions, stress management, exercise" },
  { slug: "new-to-gerd", name: "New to GERD", description: "Introductions, newly diagnosed, basic questions" },
  { slug: "general-discussion", name: "General Discussion", description: "Anything GERD-related that doesn't fit above" },
];
```

- [ ] **Step 2: Rewrite `src/pages/Index.tsx`**

Complete rewrite. The new homepage structure:

**Hero section:**
- Centered layout, wider (max-w-screen-xl)
- Headline: "Your All-in-One GERD Resource"
- Subtitle: "Track triggers, explore expert articles, and connect with a community that gets it."
- Turtle mascot image centered above headline
- Trust badge: community stats placeholder ("Join our growing community of GERD warriors")

**Three Pillars Grid:**
- 3 equal cards in a responsive grid (1 col mobile, 3 col desktop)
- Each card: icon (lucide), title, description, preview content, link
  1. Blog & Articles — BookOpen icon, latest post title + description, "Browse articles →"
  2. Community Forum — MessageSquare icon, "Ask questions, share what works", "Visit the forum →"
  3. GERDBuddy App — Smartphone icon, "Track your triggers on the go", App Store link

**Latest Activity Section:**
- Two-column layout (1 col mobile): Recent Blog Posts (left) + Recent Forum Threads (right, placeholder for now)
- Blog column shows latest 3 posts as compact cards
- Forum column shows "Coming soon" placeholder text initially (will be populated once forum is live)

**FAQ Section:**
- Keep all 18 existing Q&As and the faqSchema JSON-LD
- Restyle: remove card-elevated wrapper, use cleaner section header
- Keep accordion component

**Founder section (new):**
- Brief "Why GERDBuddy?" section
- Short paragraph about building GERDBuddy to help people manage GERD
- Personal, authentic tone

Keep all existing JSON-LD schemas (faqSchema, organizationSchema, webSiteSchema, softwareAppSchema). Update descriptions if they're overly promotional.

- [ ] **Step 3: Verify the homepage renders correctly**

```bash
npm run dev
```

Check: Hero, 3 pillars, latest activity, FAQ, founder section all render. Responsive on mobile.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Index.tsx src/config/site.ts
git commit -m "feat: redesign homepage as community resource hub with three pillars"
```

---

## Task 5: Blog Restyling

**Files:**
- Modify: `src/pages/Blog.tsx`
- Modify: `src/pages/BlogPost.tsx`

- [ ] **Step 1: Restyle `src/pages/Blog.tsx` to card grid**

Key changes:
- Change `max-w-3xl` to `max-w-screen-xl`
- Replace vertical list with responsive card grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Each card: vertical layout with date, title, description, read time, tags as small pills
- Keep existing SEO schemas unchanged
- Update header text to remove "GERDBuddy" branding prefix

- [ ] **Step 2: Update `src/pages/BlogPost.tsx`**

Key changes:
- Change `max-w-3xl` to `max-w-screen-xl` for the outer container
- Add `max-w-prose` wrapper around the markdown content for readability
- Replace the "Download on the App Store" CTA with a softer community-oriented CTA:
  - "Join the Conversation" heading
  - "Have thoughts on this topic? Share your experience in the forum."
  - Button: "Discuss in the Forum" linking to the most relevant forum category (or /forum as fallback)
  - Secondary: small "Or track your triggers with the GERDBuddy app" with App Store link
- Keep reading progress bar, breadcrumbs, related posts, all JSON-LD schemas

- [ ] **Step 3: Restyle `src/pages/Privacy.tsx` and `src/pages/Terms.tsx`**

These pages use `max-w-3xl` which will look odd at the new wider container. Update them:
- Change outer container to `max-w-screen-xl`
- Wrap the prose content in a `max-w-prose mx-auto` div for readability at the wider layout
- No content changes needed

- [ ] **Step 4: Verify blog and legal pages render correctly**

```bash
npm run dev
```

Check: Blog listing shows card grid. Blog post has wider layout but readable prose. CTA is softer. Privacy and Terms pages have readable text width.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Blog.tsx src/pages/BlogPost.tsx src/pages/Privacy.tsx src/pages/Terms.tsx
git commit -m "feat: restyle blog to card grid layout with community-oriented CTAs and widen legal pages"
```

---

## Task 6: Forum — Category Listing & Firestore Setup

**Files:**
- Create: `src/pages/Forum.tsx`
- Create: `src/components/ForumBreadcrumb.tsx`
- Create: `firestore.rules`
- Create: `firestore.indexes.json`
- Modify: `src/App.tsx` (add forum routes)

- [ ] **Step 1: Create `firestore.rules`**

Write the Firestore security rules as specified in the design spec. Key rules:
- `forums/{categorySlug}`: public read, no write (admin via console)
- `threads/{threadId}`: public read; create if authed + emailVerified + valid fields + rate limit check; update/delete if owner (only body + updatedAt)
- `threads/{threadId}/replies/{replyId}`: same pattern
- `rateLimits/{uid}`: read/write only by owning user

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /forums/{categorySlug} {
      allow read: if true;
      allow write: if false;
    }

    match /threads/{threadId} {
      allow read: if true;
      allow create: if request.auth != null
        && request.auth.token.email_verified == true
        && request.resource.data.authorId == request.auth.uid
        && request.resource.data.title is string
        && request.resource.data.title.size() > 0
        && request.resource.data.title.size() <= 200
        && request.resource.data.body is string
        && request.resource.data.body.size() > 0
        && request.resource.data.body.size() <= 5000;
      allow update: if request.auth != null
        && resource.data.authorId == request.auth.uid
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(["body", "updatedAt"]);
      allow delete: if request.auth != null
        && resource.data.authorId == request.auth.uid;

      match /replies/{replyId} {
        allow read: if true;
        allow create: if request.auth != null
          && request.auth.token.email_verified == true
          && request.resource.data.authorId == request.auth.uid
          && request.resource.data.body is string
          && request.resource.data.body.size() > 0
          && request.resource.data.body.size() <= 5000;
        allow update: if request.auth != null
          && resource.data.authorId == request.auth.uid
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(["body", "updatedAt"]);
        allow delete: if request.auth != null
          && resource.data.authorId == request.auth.uid;
      }
    }

    match /rateLimits/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

- [ ] **Step 2: Create `firestore.indexes.json`**

```json
{
  "indexes": [
    {
      "collectionGroup": "threads",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "categorySlug", "order": "ASCENDING" },
        { "fieldPath": "lastReplyAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "threads",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "authorId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

- [ ] **Step 3: Create `src/components/ForumBreadcrumb.tsx`**

Reusable breadcrumb for forum pages. Takes `items` array of `{ label, to? }`.

```tsx
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  to?: string;
}

const ForumBreadcrumb = ({ items }: { items: BreadcrumbItem[] }) => (
  <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
    <Link to="/" className="hover:text-primary transition-colors">Home</Link>
    {items.map((item, i) => (
      <span key={i} className="flex items-center gap-1.5">
        <ChevronRight className="w-3.5 h-3.5" />
        {item.to ? (
          <Link to={item.to} className="hover:text-primary transition-colors">{item.label}</Link>
        ) : (
          <span className="text-foreground">{item.label}</span>
        )}
      </span>
    ))}
  </nav>
);

export default ForumBreadcrumb;
```

- [ ] **Step 4: Create `src/pages/Forum.tsx`**

The forum landing page showing all 5 categories as cards.

- Query Firestore `forums` collection to get thread counts and last activity for each category
- Fall back to the static `FORUM_CATEGORIES` data if Firestore docs don't exist yet
- Each category card shows: name, description, thread count, last activity time
- Link each card to `/forum/:categorySlug`
- SEO: title "Community Forum", description about GERD community
- JSON-LD: use `DiscussionForumPosting` collection page or simple `WebPage`
- Breadcrumb: Home > Forum

- [ ] **Step 5: Add forum route to `src/App.tsx`**

Only add the Forum landing page route. ForumCategory, ForumThread, and NewThread routes will be added in Tasks 7 and 8 when those files are created.

```tsx
const Forum = lazy(() => import("./pages/Forum"));

// Inside Routes:
<Route path="/forum" element={<Forum />} />
```

- [ ] **Step 6: Verify Forum page builds and renders**

```bash
npm run dev
```

Navigate to `/forum`. Should see 5 category cards (with zero threads since Firestore is empty).

- [ ] **Step 7: Commit**

```bash
git add src/pages/Forum.tsx src/components/ForumBreadcrumb.tsx firestore.rules firestore.indexes.json src/App.tsx
git commit -m "feat: add forum category listing page with Firestore rules and indexes"
```

---

## Task 7: Forum — Thread List & Creation

**Files:**
- Create: `src/pages/ForumCategory.tsx`
- Create: `src/pages/NewThread.tsx`
- Create: `src/components/ThreadCard.tsx`
- Modify: `src/App.tsx` (add ForumCategory and NewThread routes)

- [ ] **Step 1: Create `src/components/ThreadCard.tsx`**

Displays a single thread preview in the thread list.

Props: `thread` object with title, authorName, replyCount, lastReplyAt, createdAt, id, categorySlug.

Shows:
- Title (linked to thread)
- "by {authorName}" + relative time (use date-fns `formatDistanceToNow`)
- Reply count badge
- Last activity time

```tsx
import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ThreadCardProps {
  thread: {
    id: string;
    title: string;
    authorName: string;
    replyCount: number;
    lastReplyAt: Date;
    createdAt: Date;
    categorySlug: string;
  };
}

const ThreadCard = ({ thread }: ThreadCardProps) => (
  <Link to={`/forum/${thread.categorySlug}/${thread.id}`} className="block group">
    <div className="p-4 rounded-xl border border-border/50 bg-card transition-all duration-200 group-hover:border-primary/30 group-hover:shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h3 className="font-display font-semibold group-hover:text-primary transition-colors truncate">
            {thread.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            by {thread.authorName} · {formatDistanceToNow(thread.createdAt, { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
          <MessageSquare className="w-4 h-4" />
          <span>{thread.replyCount}</span>
        </div>
      </div>
    </div>
  </Link>
);

export default ThreadCard;
```

- [ ] **Step 2: Create `src/pages/ForumCategory.tsx`**

Thread list page for a single category.

- Get `category` slug from URL params
- Look up category name from `FORUM_CATEGORIES`
- Query Firestore: `threads` where `categorySlug == category`, ordered by `lastReplyAt` desc, limit 20
- Implement cursor-based pagination with "Load More" button using `startAfter(lastDoc)`
- Show `ThreadCard` for each thread
- "New Thread" button: if logged in, link to `/forum/:category/new`. If not, link to `/login`
- Empty state: "No threads yet. Be the first to start a discussion!"
- Breadcrumb: Home > Forum > {Category Name}
- SEO: title "{Category Name} - Forum"

- [ ] **Step 3: Create `src/pages/NewThread.tsx`**

Thread creation form. Requires auth + email verified.

- If not logged in, redirect to `/login`
- If logged in but not verified, show verification banner + disabled form
- Form fields: title (max 200 chars), body (max 5000 chars, textarea)
- On submit:
  1. Check/update rate limit doc (`rateLimits/{uid}`) — client-side check before posting
  2. Create thread doc in `threads` collection
  3. Update `forums/{categorySlug}` — use `set({ merge: true })` with `increment()` for threadCount and `serverTimestamp()` for lastActivity (batched write). Using `set` with merge instead of `update` so it works even if the forum doc hasn't been seeded yet.
  4. Navigate to the new thread page
- Key imports needed: `writeBatch`, `doc`, `collection`, `addDoc`, `serverTimestamp`, `increment` from `firebase/firestore`
- Breadcrumb: Home > Forum > {Category Name} > New Thread

- [ ] **Step 4: Add ForumCategory and NewThread routes to `src/App.tsx`**

```tsx
const ForumCategory = lazy(() => import("./pages/ForumCategory"));
const NewThread = lazy(() => import("./pages/NewThread"));

// Inside Routes:
<Route path="/forum/:category" element={<ForumCategory />} />
<Route path="/forum/:category/new" element={<NewThread />} />
```

- [ ] **Step 5: Verify thread listing and creation work**

```bash
npm run dev
```

Navigate to `/forum/general-discussion`. See empty state. Click "New Thread" (must be logged in). Create a thread. See it appear in the list.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ForumCategory.tsx src/pages/NewThread.tsx src/components/ThreadCard.tsx src/App.tsx
git commit -m "feat: add forum thread list with pagination and thread creation"
```

---

## Task 8: Forum — Thread View & Replies

**Files:**
- Create: `src/pages/ForumThread.tsx`
- Create: `src/components/ReplyCard.tsx`
- Create: `src/components/ReplyForm.tsx`
- Modify: `src/App.tsx` (add ForumThread route)

- [ ] **Step 1: Create `src/components/ReplyCard.tsx`**

Displays a single reply in a thread.

Props: `reply` object (body, authorName, createdAt, authorId), `currentUserId`, `onEdit`, `onDelete`.

Shows:
- InitialAvatar + author name + relative time
- Body text
- Edit/Delete buttons (only if `authorId === currentUserId`)
- Edit mode: textarea replaces body text, Save/Cancel buttons

- [ ] **Step 2: Create `src/components/ReplyForm.tsx`**

Reply input form at the bottom of a thread.

- Textarea (max 5000 chars) + "Reply" button
- If not logged in: show "Sign in to reply" link
- If logged in but not verified: show "Verify your email to reply" message
- On submit (all in a single batched write):
  1. Check/update rate limit doc (`rateLimits/{uid}`) — client-side check
  2. Create reply in `threads/{threadId}/replies` subcollection
  3. Update thread's `replyCount` with `increment(1)` and `lastReplyAt` with `serverTimestamp()`
  4. Update parent forum's `lastActivity` with `set({ merge: true })` + `serverTimestamp()`
  5. Clear the textarea
- Key imports: `writeBatch`, `doc`, `collection`, `addDoc`, `serverTimestamp`, `increment` from `firebase/firestore`

- [ ] **Step 3: Create `src/pages/ForumThread.tsx`**

Full thread view with original post and replies.

- Get `threadId` from URL params
- Fetch thread doc from `threads/{threadId}`
- Fetch replies from `threads/{threadId}/replies`, ordered by `createdAt` asc
- Display original post at top (like a ReplyCard but styled slightly differently — larger title, original post badge)
- Display replies below
- ReplyForm at the bottom
- Author can edit/delete their own posts (original thread body, or their replies)
- Edit thread: only body field, not title
- Delete thread: removes the thread doc, decrements `forums/{categorySlug}.threadCount` with `increment(-1)` in a batched write (replies become orphaned — acceptable for MVP)
- Breadcrumb: Home > Forum > {Category Name} > {Thread Title}
- SEO: title "{Thread Title} - Forum", description from first 160 chars of body
- JSON-LD: DiscussionForumPosting schema with `comment` array for replies

- [ ] **Step 4: Add ForumThread route to `src/App.tsx`**

```tsx
const ForumThread = lazy(() => import("./pages/ForumThread"));

// Inside Routes:
<Route path="/forum/:category/:threadId" element={<ForumThread />} />
```

- [ ] **Step 5: Verify thread view and replying works**

```bash
npm run dev
```

Navigate to a thread. See original post and any replies. Post a reply. Edit a reply. Delete a reply.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ForumThread.tsx src/components/ReplyCard.tsx src/components/ReplyForm.tsx src/App.tsx
git commit -m "feat: add forum thread view with replies, edit, and delete"
```

---

## Task 9: Homepage — Live Forum Activity

**Files:**
- Modify: `src/pages/Index.tsx`

- [ ] **Step 1: Connect the "Latest Activity" section to Firestore**

Replace the forum placeholder in the Latest Activity section with a real query:
- Query `threads` collection, ordered by `createdAt` desc, limit 5
- Show each as a compact thread preview: title, category name, author, time ago
- Link each to the thread page
- If no threads exist, show "Be the first to start a discussion!" with link to /forum

- [ ] **Step 2: Verify homepage shows live forum threads**

```bash
npm run dev
```

Create a thread via the forum, then check homepage — it should appear in the latest activity section.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "feat: connect homepage latest activity section to live forum data"
```

---

## Task 10: Profile — User's Posts

**Files:**
- Modify: `src/pages/Profile.tsx`

- [ ] **Step 1: Connect profile page to Firestore**

- Query `threads` where `authorId == user.uid`, ordered by `createdAt` desc
- Show thread list using ThreadCard component
- Show post count (thread count from query results)
- If no posts, show "You haven't posted yet. Join the discussion!" with link to /forum

- [ ] **Step 2: Verify profile shows user's posts**

```bash
npm run dev
```

Log in, create threads, check profile page — should show all threads.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Profile.tsx
git commit -m "feat: connect profile page to show user's forum posts"
```

---

## Task 11: Sitemap & Final SEO

**Files:**
- Modify: `scripts/generate-sitemap.js`

- [ ] **Step 1: Add static forum routes to sitemap**

Add the forum landing page and each category page to the static pages list:

```javascript
const staticPages = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/blog", priority: "0.8", changefreq: "weekly" },
  { path: "/forum", priority: "0.8", changefreq: "daily" },
  { path: "/forum/food-and-triggers", priority: "0.7", changefreq: "daily" },
  { path: "/forum/medication-and-treatment", priority: "0.7", changefreq: "daily" },
  { path: "/forum/lifestyle-and-tips", priority: "0.7", changefreq: "daily" },
  { path: "/forum/new-to-gerd", priority: "0.7", changefreq: "daily" },
  { path: "/forum/general-discussion", priority: "0.7", changefreq: "daily" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
];
```

Note: Individual thread pages are dynamic (Firestore) and won't be in the static sitemap. This is fine per the spec — we'll add a dynamic sitemap via Cloud Function later if needed.

- [ ] **Step 2: Verify sitemap generates correctly**

```bash
npm run build
cat dist/sitemap.xml | head -30
```

Expected: See forum routes in the sitemap.

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-sitemap.js
git commit -m "feat: add forum routes to sitemap"
```

---

## Task 12: Firestore Seed Data & Final Verification

**Files:** None new — this is verification and seeding.

- [ ] **Step 1: Seed forum categories in Firestore**

Using the Firebase console (or a one-time script), create the 5 category documents in the `forums` collection:

```
forums/food-and-triggers      → { name: "Food & Triggers", description: "What to eat, what to avoid, recipes", threadCount: 0, lastActivity: now }
forums/medication-and-treatment → { name: "Medication & Treatment", description: "PPIs, H2 blockers, natural remedies", threadCount: 0, lastActivity: now }
forums/lifestyle-and-tips      → { name: "Lifestyle & Tips", description: "Sleep positions, stress management, exercise", threadCount: 0, lastActivity: now }
forums/new-to-gerd             → { name: "New to GERD", description: "Introductions, newly diagnosed, basic questions", threadCount: 0, lastActivity: now }
forums/general-discussion      → { name: "General Discussion", description: "Anything GERD-related that doesn't fit above", threadCount: 0, lastActivity: now }
```

- [ ] **Step 2: Deploy Firestore security rules**

Deploy `firestore.rules` via the Firebase console or CLI.

- [ ] **Step 3: Deploy Firestore indexes**

Deploy `firestore.indexes.json` via Firebase CLI:

```bash
firebase deploy --only firestore:indexes
```

- [ ] **Step 4: Set Vercel environment variables**

Add all `VITE_FIREBASE_*` environment variables to the Vercel project settings.

- [ ] **Step 5: Full end-to-end test**

Run locally with real Firebase credentials in `.env`:

```bash
npm run dev
```

Test flow:
1. Homepage renders with new design (hero, 3 pillars, FAQ)
2. Navigate to /blog — card grid layout
3. Navigate to a blog post — wider layout, forum CTA
4. Navigate to /forum — 5 categories visible
5. Click "Sign In" → /login
6. Register a new account → verification email sent
7. Log in → user menu shows in nav
8. Navigate to /forum/general-discussion → empty state
9. Click "New Thread" → create a thread
10. See thread in list → click into it
11. Post a reply
12. Edit the reply
13. Delete the reply
14. Check /profile → see the thread listed
15. Check homepage → see thread in latest activity
16. Sign out → forum is readable, posting requires sign-in

- [ ] **Step 6: Build for production**

```bash
npm run build
```

Expected: Clean build, no errors.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete community hub redesign with forum, auth, and new design"
```

---

## Known Limitations & Follow-ups

These are acknowledged deviations or deferrals from the spec:

1. **Rate limiting is client-side only.** The spec envisions Firestore security rules validating rate limits server-side via `get()` calls. For MVP, rate limiting is enforced client-side only (checking `rateLimits/{uid}` doc before posting). A motivated user could bypass this via direct Firestore API calls. Add server-side enforcement in rules when abuse becomes a concern.
2. **robots.txt not updated.** Current robots.txt likely just points to the sitemap, which is updated. Verify and update if needed.
3. **RSS feed (`scripts/generate-feed.js`) not updated** to include forum threads. Spec says "optionally" — defer until forum has meaningful content.
4. **Smart App Banner forum link** not added. Low priority.
5. **Dark theme `--gradient-surface`** not updated to match the cleaner light theme direction. Review and adjust.
