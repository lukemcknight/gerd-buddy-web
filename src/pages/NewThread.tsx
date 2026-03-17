import { useState } from "react";
import { useParams, Navigate, useNavigate, Link } from "react-router-dom";
import {
  writeBatch,
  doc,
  collection,
  serverTimestamp,
  increment,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { FORUM_CATEGORIES } from "@/config/site";
import SEO from "@/components/SEO";
import ForumBreadcrumb from "@/components/ForumBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

const TITLE_MAX = 200;
const BODY_MAX = 5000;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_POSTS = 10;

const NewThread = () => {
  const { category } = useParams<{ category: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryInfo = FORUM_CATEGORIES.find((c) => c.slug === category);

  if (!categoryInfo) {
    return <Navigate to="/forum" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const emailVerified = user.emailVerified;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle || !trimmedBody) {
      setError("Title and body are required.");
      return;
    }

    setSubmitting(true);
    try {
      // Check rate limit
      const rateLimitRef = doc(db, "rateLimits", user.uid);
      const rateLimitSnap = await getDoc(rateLimitRef);
      let postCount = 0;
      let windowStart = Timestamp.now();

      if (rateLimitSnap.exists()) {
        const data = rateLimitSnap.data();
        const existingWindowStart = data.windowStart as Timestamp;
        const elapsed = Date.now() - existingWindowStart.toMillis();

        if (elapsed < RATE_LIMIT_WINDOW_MS) {
          postCount = data.postCount ?? 0;
          windowStart = existingWindowStart;

          if (postCount >= RATE_LIMIT_MAX_POSTS) {
            setError("You've reached the posting limit. Please try again later.");
            setSubmitting(false);
            return;
          }
        }
        // If window expired, reset (postCount stays 0, windowStart stays now)
      }

      // Create thread with batched write
      const newThreadRef = doc(collection(db, "threads"));
      const batch = writeBatch(db);

      batch.set(newThreadRef, {
        title: trimmedTitle,
        body: trimmedBody,
        authorId: user.uid,
        authorName: user.displayName ?? "Anonymous",
        categorySlug: category,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        replyCount: 0,
        lastReplyAt: serverTimestamp(),
      });

      batch.set(
        doc(db, "forums", category!),
        {
          threadCount: increment(1),
          lastActivity: serverTimestamp(),
        },
        { merge: true }
      );

      batch.set(rateLimitRef, {
        postCount: postCount + 1,
        windowStart: postCount === 0 ? serverTimestamp() : windowStart,
      });

      await batch.commit();
      navigate(`/forum/${category}/${newThreadRef.id}`);
    } catch (err) {
      console.error("Error creating thread:", err);
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8 space-y-6">
      <SEO
        title={`New Thread - ${categoryInfo.name}`}
        description={`Start a new discussion in ${categoryInfo.name}`}
        path={`/forum/${category}/new`}
      />

      <ForumBreadcrumb
        items={[
          { label: "Forum", to: "/forum" },
          { label: categoryInfo.name, to: `/forum/${category}` },
          { label: "New Thread" },
        ]}
      />

      <div className="max-w-2xl">
        <h1 className="text-2xl font-display font-bold mb-6">New Thread</h1>

        {!emailVerified && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 mb-6">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              Please verify your email before posting. Check your inbox for a verification link.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="What's on your mind?"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
              disabled={!emailVerified || submitting}
              maxLength={TITLE_MAX}
            />
            <p className="text-xs text-muted-foreground text-right">
              {title.length}/{TITLE_MAX}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              placeholder="Share your thoughts, questions, or experiences..."
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
              disabled={!emailVerified || submitting}
              maxLength={BODY_MAX}
              rows={8}
            />
            <p className="text-xs text-muted-foreground text-right">
              {body.length}/{BODY_MAX}
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!emailVerified || submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Posting...
                </>
              ) : (
                "Post Thread"
              )}
            </Button>
            <Link to={`/forum/${category}`}>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewThread;
