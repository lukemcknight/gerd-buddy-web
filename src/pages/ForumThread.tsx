import { useState, useEffect, useCallback } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { FORUM_CATEGORIES, SITE_URL } from "@/config/site";
import SEO from "@/components/SEO";
import ForumBreadcrumb from "@/components/ForumBreadcrumb";
import InitialAvatar from "@/components/InitialAvatar";
import ReplyCard from "@/components/ReplyCard";
import ReplyForm from "@/components/ReplyForm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface ThreadData {
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  categorySlug: string;
  createdAt: Date;
  updatedAt: Date;
  replyCount: number;
}

interface ReplyData {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
}

const ForumThread = () => {
  const { category, threadId } = useParams<{ category: string; threadId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [thread, setThread] = useState<ThreadData | null>(null);
  const [replies, setReplies] = useState<ReplyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Thread edit state
  const [editingThread, setEditingThread] = useState(false);
  const [editThreadBody, setEditThreadBody] = useState("");

  const categoryInfo = FORUM_CATEGORIES.find((c) => c.slug === category);

  const fetchReplies = useCallback(async () => {
    if (!threadId) return;
    try {
      const q = query(
        collection(db, "threads", threadId, "replies"),
        orderBy("createdAt", "asc")
      );
      const snapshot = await getDocs(q);
      const fetched: ReplyData[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          body: data.body,
          authorId: data.authorId,
          authorName: data.authorName,
          createdAt: data.createdAt?.toDate() ?? new Date(),
        };
      });
      setReplies(fetched);
    } catch (err) {
      console.error("Error fetching replies:", err);
    }
  }, [threadId]);

  useEffect(() => {
    if (!threadId || !categoryInfo) return;

    const fetchThread = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "threads", threadId));
        if (!snap.exists()) {
          setNotFound(true);
          return;
        }
        const data = snap.data();
        setThread({
          title: data.title,
          body: data.body,
          authorId: data.authorId,
          authorName: data.authorName,
          categorySlug: data.categorySlug,
          createdAt: data.createdAt?.toDate() ?? new Date(),
          updatedAt: data.updatedAt?.toDate() ?? new Date(),
          replyCount: data.replyCount ?? 0,
        });
        setEditThreadBody(data.body);

        await fetchReplies();
      } catch (err) {
        console.error("Error fetching thread:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchThread();
  }, [threadId, categoryInfo, fetchReplies]);

  if (!categoryInfo) {
    return <Navigate to="/forum" replace />;
  }

  if (notFound) {
    return <Navigate to={`/forum/${category}`} replace />;
  }

  if (loading || !thread) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const isThreadAuthor = thread.authorId === (user?.uid ?? null);

  const handleEditThread = async () => {
    const trimmed = editThreadBody.trim();
    if (!trimmed || !threadId) return;
    try {
      await updateDoc(doc(db, "threads", threadId), {
        body: trimmed,
        updatedAt: serverTimestamp(),
      });
      setThread((prev) => prev ? { ...prev, body: trimmed, updatedAt: new Date() } : prev);
      setEditingThread(false);
    } catch (err) {
      console.error("Error editing thread:", err);
    }
  };

  const handleDeleteThread = async () => {
    if (!threadId || !category) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "threads", threadId));
      batch.update(doc(db, "forums", category), {
        threadCount: increment(-1),
      });
      await batch.commit();
      navigate(`/forum/${category}`);
    } catch (err) {
      console.error("Error deleting thread:", err);
    }
  };

  const handleEditReply = async (replyId: string, newBody: string) => {
    if (!threadId) return;
    try {
      await updateDoc(doc(db, "threads", threadId, "replies", replyId), {
        body: newBody,
        updatedAt: serverTimestamp(),
      });
      setReplies((prev) =>
        prev.map((r) => (r.id === replyId ? { ...r, body: newBody } : r))
      );
    } catch (err) {
      console.error("Error editing reply:", err);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!threadId) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "threads", threadId, "replies", replyId));
      batch.update(doc(db, "threads", threadId), {
        replyCount: increment(-1),
      });
      await batch.commit();
      setReplies((prev) => prev.filter((r) => r.id !== replyId));
      setThread((prev) =>
        prev ? { ...prev, replyCount: Math.max(0, prev.replyCount - 1) } : prev
      );
    } catch (err) {
      console.error("Error deleting reply:", err);
    }
  };

  const truncatedTitle =
    thread.title.length > 50 ? thread.title.slice(0, 50) + "..." : thread.title;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: thread.title,
    text: thread.body,
    author: { "@type": "Person", name: thread.authorName },
    datePublished: thread.createdAt.toISOString(),
    dateModified: thread.updatedAt.toISOString(),
    url: `${SITE_URL}/forum/${category}/${threadId}`,
    comment: replies.map((r) => ({
      "@type": "Comment",
      text: r.body,
      author: { "@type": "Person", name: r.authorName },
      datePublished: r.createdAt.toISOString(),
    })),
  };

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8 space-y-6">
      <SEO
        title={`${thread.title} - Community Forum`}
        description={thread.body.slice(0, 160)}
        path={`/forum/${category}/${threadId}`}
        jsonLd={jsonLd}
      />

      <ForumBreadcrumb
        items={[
          { label: "Forum", to: "/forum" },
          { label: categoryInfo.name, to: `/forum/${category}` },
          { label: truncatedTitle },
        ]}
      />

      <div className="max-w-3xl space-y-6">
        {/* Original post */}
        <div className="space-y-4">
          <h1 className="text-2xl md:text-3xl font-display font-bold">{thread.title}</h1>

          <div className="flex items-center gap-3">
            <InitialAvatar name={thread.authorName} />
            <div>
              <p className="font-semibold text-sm">{thread.authorName}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(thread.createdAt, { addSuffix: true })}
              </p>
            </div>
          </div>

          {editingThread ? (
            <div className="space-y-2">
              <Textarea
                value={editThreadBody}
                onChange={(e) => setEditThreadBody(e.target.value.slice(0, 5000))}
                rows={6}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEditThread}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditThreadBody(thread.body);
                    setEditingThread(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{thread.body}</p>
          )}

          {isThreadAuthor && !editingThread && (
            <div className="flex gap-2">
              <button
                onClick={() => setEditingThread(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Edit
              </button>
              <button
                onClick={handleDeleteThread}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Replies */}
        <div className="border-t pt-4">
          <h2 className="text-lg font-semibold mb-2">
            {thread.replyCount} {thread.replyCount === 1 ? "Reply" : "Replies"}
          </h2>

          {replies.length > 0 && (
            <div>
              {replies.map((reply) => (
                <ReplyCard
                  key={reply.id}
                  reply={reply}
                  currentUserId={user?.uid ?? null}
                  onEdit={handleEditReply}
                  onDelete={handleDeleteReply}
                />
              ))}
            </div>
          )}
        </div>

        {/* Reply form */}
        <ReplyForm
          threadId={threadId!}
          categorySlug={category!}
          onReplyAdded={fetchReplies}
        />
      </div>
    </div>
  );
};

export default ForumThread;
