# GERDBuddy Community Hub Redesign — Design Spec

**Date:** 2026-03-16
**Status:** Approved
**Approach:** Hybrid — static pages remain as-is, forum is client-rendered with Firebase

## Overview

Transform gerdbuddy.app from a promotional app landing page into an all-in-one GERD community resource hub. Add a lightweight discussion forum with Firebase-backed user accounts (shared with the mobile app). Redesign the site to feel less promotional and more like a health community — inspired by sober-tracker.com's clean, trustworthy aesthetic.

## Goals

1. Reposition the website as a community resource hub (blog + forum + app as equal pillars)
2. Add a lightweight discussion forum for SEO value and community engagement
3. Add user authentication via Firebase (shared accounts with mobile app)
4. Redesign the site with a cleaner, wider, more spacious layout
5. Shift tone from promotional to community-oriented

## Architecture

### Current State
- React 18 + TypeScript + Vite SPA
- Tailwind CSS + shadcn/ui components
- Deployed on Vercel
- No backend, no auth, no database
- 6 routes: home, blog listing, blog post, privacy, terms, 404
- 28 blog articles stored as TypeScript files

### Target State
- Same React SPA with Firebase added for auth + Firestore for forum data
- New routes for auth (login, register, profile) and forum (categories, threads, replies)
- Redesigned homepage and restyled existing pages
- Wider layout (max ~1200px vs current 480px)
- Shared Firebase project with mobile app for seamless accounts

### Why Hybrid (Not SSR/Next.js)
- Avoids rewriting the entire site
- Existing SEO (blog, FAQ) stays intact
- Forum SEO is achievable via client rendering (Google handles this well) plus optional prerendering for high-traffic threads
- Ships faster, lower risk
- Can migrate to Next.js later if forum SEO demands it

## 1. Homepage Redesign

### Hero Section
- Clean, centered layout
- Headline: "Your All-in-One GERD Resource" (or similar)
- Subtitle: "Track triggers, explore expert articles, and connect with a community that gets it."
- No aggressive app download CTA
- Trust badge with community stats (e.g., "Join 500+ members managing GERD together")

### Three Pillars Grid
Three equal cards below the hero:
1. **Blog & Articles** — "Expert tips on managing GERD" + latest post preview, links to /blog
2. **Community Forum** — "Ask questions, share what works" + recent thread preview, links to /forum
3. **GERDBuddy App** — "Track your triggers on the go" + app screenshot, links to app stores

### Latest Activity Section
- Combined feed showing recent blog posts and recent forum threads side by side
- Keeps the homepage feeling alive and active

### FAQ Section
- Keep existing 18 Q&As
- Restyle to match the cleaner design

### Footer
- Multi-column layout: Quick Links, Community, Legal, Contact
- Similar structure to sober-tracker.com

## 2. Design & Visual Style

### Overall Direction
- Shift from "app landing page" to "community health resource"
- Cleaner, more spacious layout with more white space
- Less gradient-heavy
- Calm, trustworthy aesthetic inspired by sober-tracker.com

### Layout
- Outer container max width: ~1200px (up from current ~768px)
- Full-width sections with contained content
- Prose content (blog posts, forum post bodies) stays narrower (~65ch / max-w-prose) for readability
- Consistent section spacing with generous padding
- Card-based content organization throughout

### Color Palette
- Keep existing tokens: sage green (primary), soft teal (secondary), warm coral (accent)
- Dial back gradients and glows
- Background: cleaner white/light gray instead of cream gradients
- Coral accent used sparingly for important CTAs only

### Typography
- Keep Plus Jakarta Sans (headers) and DM Sans (body)
- Increase heading sizes for the wider layout
- More breathing room between sections

### Navigation
- Expand navbar: Home, Blog, Forum, App
- Add "Sign In" / user avatar button on the right
- Keep sticky header with backdrop blur
- Responsive mobile menu updated with new items

### Tone Shift
- Remove promotional language ("Download now", "Get the app" as primary CTAs)
- Replace with community language: "Join the discussion", "Read more", "Share your experience"
- Add founder/personal section about why GERDBuddy exists

## 3. Authentication System

### Firebase Auth
- Email/password sign-up with email verification link
- Shared Firebase project with mobile app — same user accounts
- Password reset via Firebase's built-in email reset flow
- **Unverified users:** Can browse all content (forum, blog) but cannot create threads or replies. A persistent banner at the top prompts them to check their email and verify before posting.

### Firebase Config
- Firebase config in `src/lib/firebase.ts`, reading from Vite env vars (`import.meta.env.VITE_FIREBASE_API_KEY`, etc.)
- `.env.example` added with all required `VITE_FIREBASE_*` keys documented
- Vercel environment variables configured for production
- Same Firebase project as mobile app (no new project needed)

### React Integration
- `AuthContext` provider wrapping the app
- Routes: `/login`, `/register`, `/profile`
- Persistent session (Firebase SDK handles token refresh)
- Nav bar: "Sign In" when logged out, display name + dropdown (Profile, Sign Out) when logged in

### User Profile (Minimal)
- Display name (chosen at registration)
- Member since date
- Post count
- Initial-based colored circles for avatars (no image upload)
- Profile page at `/profile` showing user's posts

### Security
- Firestore security rules: users can only edit/delete their own posts
- Rate limiting: max 10 posts per hour (via Firestore rules or Cloud Function)
- Content length limits: title 200 chars, body 5000 chars

## 4. Forum

### Routes
- `/forum` — Category listing with thread counts and latest activity
- `/forum/:category` — Thread list for a category, sorted by newest activity
- `/forum/:category/:threadId` — Thread view with replies

### Categories
1. Food & Triggers
2. Medication & Treatment
3. Lifestyle & Tips
4. New to GERD
5. General Discussion

### Thread List Page
- Each thread: title, author name, reply count, time of last activity
- Sorted by most recent activity (new reply bumps thread)
- Pagination: 20 threads per page
- "New Thread" button: visible to logged-in users, sign-in prompt for guests

### Thread View Page
- Original post at top, replies below in chronological order
- Each post: author name, initial avatar, date, content
- Reply box at bottom (logged-in only, sign-in prompt for guests)
- Author can edit/delete their own posts

### Firestore Data Model

Replies use subcollections under threads for simpler queries and security rules:

```
forums/{categorySlug}
  - name: string
  - description: string
  - threadCount: number
  - lastActivity: timestamp

threads/{threadId}
  - title: string
  - body: string
  - authorId: string
  - authorName: string
  - categorySlug: string
  - createdAt: timestamp
  - updatedAt: timestamp
  - replyCount: number
  - lastReplyAt: timestamp

threads/{threadId}/replies/{replyId}
  - body: string
  - authorId: string
  - authorName: string
  - createdAt: timestamp
  - updatedAt: timestamp
```

**Counter updates:** When creating a thread, use a batched write to atomically increment `forums/{categorySlug}.threadCount` and set `lastActivity`. When creating a reply, use a batched write to atomically increment `threads/{threadId}.replyCount`, update `lastReplyAt`, and update the parent forum's `lastActivity`.

**Author name denormalization:** `authorName` is stored as a snapshot at post time. If a user changes their display name, historical posts retain the old name. This is acceptable for a lightweight forum — no propagation needed.

### Firestore Indexes

Required composite indexes:
- `threads` collection: `categorySlug` ASC + `lastReplyAt` DESC (thread list sorted by activity)
- `threads` collection: `authorId` ASC + `createdAt` DESC (user profile — my posts)

### Firestore Security Rules (Pseudocode)

```
forums/{categorySlug}:
  read: allow (public, needed for SEO)
  write: deny (admin-only via console)

threads/{threadId}:
  read: allow (public, needed for SEO)
  create: allow if authed AND emailVerified
    AND request.resource.data.title.size() <= 200
    AND request.resource.data.body.size() <= 5000
    AND request.resource.data.authorId == request.auth.uid
    AND rateLimitCheck(request.auth.uid)
  update: allow if authed AND resource.data.authorId == request.auth.uid
    AND only(body, updatedAt) changed
  delete: allow if authed AND resource.data.authorId == request.auth.uid

threads/{threadId}/replies/{replyId}:
  read: allow (public)
  create: allow if authed AND emailVerified
    AND request.resource.data.body.size() <= 5000
    AND request.resource.data.authorId == request.auth.uid
    AND rateLimitCheck(request.auth.uid)
  update: allow if authed AND resource.data.authorId == request.auth.uid
    AND only(body, updatedAt) changed
  delete: allow if authed AND resource.data.authorId == request.auth.uid
```

### Rate Limiting

Use a per-user document `rateLimits/{uid}` with fields `postCount` (number) and `windowStart` (timestamp). On each post/reply creation, check this document in security rules:
- If `windowStart` is older than 1 hour, allow and reset counter to 1
- If `postCount` >= 10 within the current window, deny
- Otherwise, increment `postCount`

This is updated client-side in the same batched write as the post creation, with security rules validating the math is correct.

### Forum SEO
- Meta tags on each category and thread page via existing SEO component
- DiscussionForumPosting structured data (JSON-LD) on thread pages:
  - `@type`: DiscussionForumPosting
  - `headline`: thread title
  - `author`: `{ @type: Person, name: authorName }`
  - `datePublished`, `dateModified`
  - `text`: thread body
  - `comment`: array of replies as `Comment` objects
- Thread title → page title; first ~160 chars of body → meta description
- Sitemap: defer forum routes from sitemap for now (content is dynamic in Firestore). Add a dynamic sitemap endpoint later via Cloud Function if SEO warrants it.
- High-traffic threads can be added to prerender script later

### Pagination

Firestore uses cursor-based pagination (not offset-based). Thread lists use `startAfter(lastDocument)` with a "Load More" button pattern rather than numbered pages. Pagination state is client-side only (not reflected in URL).

### Moderation
- No admin UI to start — moderate via Firebase console
- Add admin features later if community grows

## 5. Blog & Existing Content Updates

### Blog Page
- Restyle to card grid (2-3 columns on desktop)
- Each card: title, excerpt, read time, tags, date

### Blog Post Page
- Keep reading progress bar, related posts, breadcrumbs
- Widen content area for new layout
- Add "Discuss this article on the forum" link at bottom

### Existing Pages (Privacy, Terms)
- Restyle to match new design
- No content changes

### Site-wide
- Update robots.txt and sitemap script to include forum routes
- Update RSS feed script to optionally include popular forum threads
- Add forum link to Smart App Banner area

## Dependencies

- Firebase JS SDK (auth + Firestore)
- Firebase project already exists (shared with mobile app)
- No new hosting requirements (stays on Vercel)
- No additional server-side infrastructure (rate limiting handled via Firestore rules + client-side documents)

## Out of Scope

- Image uploads in forum posts
- User avatars (image-based)
- Moderation admin panel
- Direct messaging between users
- Upvoting/downvoting
- User reputation/karma
- SSR/Next.js migration
- Forum notification emails
- Forum search (defer until community grows)
- OAuth providers (Google/Apple sign-in on web — may add later if mobile app users need it)
