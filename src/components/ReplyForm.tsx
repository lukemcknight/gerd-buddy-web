import { useState } from "react";
import { Link } from "react-router-dom";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

const BODY_MAX = 5000;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_POSTS = 10;

interface ReplyFormProps {
  threadId: string;
  categorySlug: string;
  onReplyAdded: () => void;
}

const ReplyForm = ({ threadId, categorySlug, onReplyAdded }: ReplyFormProps) => {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="rounded-xl border border-border bg-muted/50 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>{" "}
          to reply
        </p>
      </div>
    );
  }

  if (!user.emailVerified) {
    return (
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
        <p className="text-sm text-yellow-700 dark:text-yellow-400">
          Verify your email to reply. Check your inbox for a verification link.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = body.trim();
    if (!trimmed) return;

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
      }

      // Batched write
      const batch = writeBatch(db);

      const replyRef = doc(collection(db, "threads", threadId, "replies"));
      batch.set(replyRef, {
        body: trimmed,
        authorId: user.uid,
        authorName: user.displayName ?? "Anonymous",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update thread
      const threadRef = doc(db, "threads", threadId);
      batch.update(threadRef, {
        replyCount: increment(1),
        lastReplyAt: serverTimestamp(),
      });

      // Update forum category
      batch.set(
        doc(db, "forums", categorySlug),
        { lastActivity: serverTimestamp() },
        { merge: true }
      );

      // Update rate limit
      batch.set(rateLimitRef, {
        postCount: postCount + 1,
        windowStart: postCount === 0 ? serverTimestamp() : windowStart,
      });

      await batch.commit();
      setBody("");
      onReplyAdded();
    } catch (err) {
      console.error("Error posting reply:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        placeholder="Write a reply..."
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
        disabled={submitting}
        maxLength={BODY_MAX}
        rows={4}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {body.length}/{BODY_MAX}
        </p>
        <Button type="submit" size="sm" disabled={submitting || !body.trim()}>
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Posting...
            </>
          ) : (
            "Reply"
          )}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
};

export default ReplyForm;
