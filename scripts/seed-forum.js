/**
 * Seed the forum with starter posts.
 *
 * Usage:
 *   1. Set GOOGLE_APPLICATION_CREDENTIALS to your service account key:
 *        export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"
 *   2. Run:
 *        node scripts/seed-forum.js
 *
 *   Or, if you've run `gcloud auth application-default login`, it should
 *   pick up your credentials automatically.
 */

import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const AUTHOR_NAME = "GERDBuddy";
const AUTHOR_ID = "seed-gerdbuddy"; // placeholder — replace with your real UID if desired

const SEED_THREADS = [
  // ── food-and-triggers ──
  {
    categorySlug: "food-and-triggers",
    title: "What are your biggest trigger foods?",
    body: `Hey everyone! Let's get a thread going — what foods have you found to be your worst triggers?\n\nFor me, tomato-based sauces and anything with raw onion are almost guaranteed to set things off. Citrus fruits can be hit-or-miss depending on the day.\n\nCurious to hear what you've discovered through tracking. Drop yours below!`,
  },
  {
    categorySlug: "food-and-triggers",
    title: "Safe meal ideas that actually taste good",
    body: `One of the hardest parts of managing GERD is feeling like every meal is bland and boring. I wanted to share some meals that work well for me and still feel satisfying:\n\n- **Baked salmon with roasted sweet potatoes and steamed broccoli** — simple but filling\n- **Oatmeal with banana and a drizzle of honey** — great breakfast option\n- **Grilled chicken wraps with lettuce, cucumber, and a light tahini dressing**\n- **Rice bowls with ground turkey, zucchini, and a ginger glaze**\n\nWhat safe meals do you keep in rotation? Would love to build out a list we can all reference.`,
  },

  // ── medication-and-treatment ──
  {
    categorySlug: "medication-and-treatment",
    title: "PPI experiences — what's worked for you?",
    body: `I know PPIs are a common first-line treatment, and experiences seem to vary a lot from person to person.\n\nIf you've been on a PPI (omeprazole, pantoprazole, etc.), how has your experience been? How long did it take to notice improvement? Any side effects?\n\nThis isn't medical advice — just sharing experiences to help others know what to expect. Always talk to your doctor about your specific situation.`,
  },
  {
    categorySlug: "medication-and-treatment",
    title: "Natural remedies worth trying?",
    body: `Has anyone had success with natural or complementary approaches alongside their regular treatment?\n\nI've heard mixed things about:\n- Ginger tea\n- DGL licorice\n- Slippery elm\n- Melatonin (yes, really)\n- Apple cider vinegar (controversial!)\n\nWould love to hear what's actually helped people versus what's just internet hype. Again — not a replacement for medical advice, just curious about real experiences.`,
  },

  // ── lifestyle-and-tips ──
  {
    categorySlug: "lifestyle-and-tips",
    title: "Sleep tips that actually help with nighttime reflux",
    body: `Nighttime reflux was my biggest struggle for months. Here's what finally made a difference for me:\n\n1. **Elevating the head of my bed** (not just pillows — I put 6-inch risers under the headboard legs)\n2. **Eating dinner at least 3 hours before bed**\n3. **Sleeping on my left side** — this one sounds weird but there's actual science behind it\n4. **No late-night snacking**, no matter how tempting\n\nAnyone else have tips that helped with nighttime symptoms? This seems to be one of the most common struggles.`,
  },
  {
    categorySlug: "lifestyle-and-tips",
    title: "Stress and GERD — the connection is real",
    body: `I used to think the stress connection was exaggerated, but after tracking my symptoms alongside stressful periods, the pattern is unmistakable.\n\nSome things that have helped me manage stress-related flare-ups:\n- Short walks after meals\n- Breathing exercises (the 4-7-8 technique is simple and effective)\n- Being more intentional about not eating when I'm stressed or rushing\n\nHas anyone else noticed a strong stress-to-symptoms connection? How do you manage it?`,
  },

  // ── new-to-gerd ──
  {
    categorySlug: "new-to-gerd",
    title: "Welcome! Introduce yourself here",
    body: `Welcome to the GERDBuddy community! Whether you've just been diagnosed or have been dealing with GERD for years, this is a place to connect, share, and support each other.\n\nFeel free to introduce yourself:\n- How long have you been dealing with GERD/acid reflux?\n- What brought you to GERDBuddy?\n- What's been your biggest challenge so far?\n\nNo question is too basic here — we've all been at the beginning at some point. Looking forward to hearing from you!`,
  },
  {
    categorySlug: "new-to-gerd",
    title: "Just diagnosed — things I wish I'd known from the start",
    body: `When I was first diagnosed, I felt overwhelmed by conflicting information online. Here are a few things I wish someone had told me early on:\n\n1. **Track your food and symptoms** — patterns aren't always obvious until you write them down (that's what GERDBuddy is for!)\n2. **Triggers are personal** — just because something is on a "foods to avoid" list doesn't mean it affects YOU, and vice versa\n3. **It gets better** — the early days of figuring things out are the hardest. Once you identify your triggers, management becomes much more manageable\n4. **Don't Dr. Google everything at 2am** — talk to your actual doctor, and use communities like this for support\n\nWhat do you wish you'd known when you were first diagnosed?`,
  },

  // ── general-discussion ──
  {
    categorySlug: "general-discussion",
    title: "How do you explain GERD to people who don't get it?",
    body: `"Just don't eat spicy food" — if only it were that simple, right?\n\nOne of the frustrating parts of GERD is that people who don't have it often don't understand how much it can affect your daily life. It's not just "a little heartburn."\n\nHow do you explain it to friends, family, or coworkers? Any good analogies or approaches that have helped people understand?`,
  },
  {
    categorySlug: "general-discussion",
    title: "Small wins — share yours!",
    body: `Managing GERD can feel like a grind sometimes, so let's celebrate the small victories.\n\nI'll start: I made it through an entire weekend trip without a single flare-up by planning meals ahead and bringing safe snacks. Felt like a huge win.\n\nWhat's a recent small win you've had? Could be anything — a new safe food you discovered, a full night's sleep, a social event where you managed your symptoms well. Let's hear it!`,
  },
];

async function seedForum() {
  // Initialize with application default credentials
  const app = initializeApp({
    projectId: "gerd-buddy-fd606",
  });

  const db = getFirestore(app);

  console.log("Seeding forum threads...\n");

  // Stagger createdAt timestamps so threads appear in a natural order
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  for (let i = 0; i < SEED_THREADS.length; i++) {
    const thread = SEED_THREADS[i];
    const timestamp = new Date(now - (SEED_THREADS.length - i) * ONE_HOUR);

    const batch = db.batch();

    // Create thread
    const threadRef = db.collection("threads").doc();
    batch.set(threadRef, {
      title: thread.title,
      body: thread.body,
      authorId: AUTHOR_ID,
      authorName: AUTHOR_NAME,
      categorySlug: thread.categorySlug,
      createdAt: timestamp,
      updatedAt: timestamp,
      replyCount: 0,
      lastReplyAt: timestamp,
    });

    // Update forum category metadata
    const forumRef = db.collection("forums").doc(thread.categorySlug);
    batch.set(
      forumRef,
      {
        threadCount: FieldValue.increment(1),
        lastActivity: timestamp,
      },
      { merge: true }
    );

    await batch.commit();
    console.log(`  ✓ [${thread.categorySlug}] "${thread.title}"`);
  }

  console.log(`\nDone! Seeded ${SEED_THREADS.length} threads across 5 categories.`);
  process.exit(0);
}

seedForum().catch((err) => {
  console.error("Error seeding forum:", err);
  process.exit(1);
});
