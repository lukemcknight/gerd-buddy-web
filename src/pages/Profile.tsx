import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import InitialAvatar from "@/components/InitialAvatar";
import ThreadCard from "@/components/ThreadCard";

interface Thread {
  id: string;
  title: string;
  authorName: string;
  replyCount: number;
  lastReplyAt: Date;
  createdAt: Date;
  categorySlug: string;
}

const Profile = () => {
  const { user, loading } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchPosts = async () => {
      setLoadingPosts(true);
      try {
        const q = query(
          collection(db, "threads"),
          where("authorId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const results: Thread[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            authorName: data.authorName,
            replyCount: data.replyCount ?? 0,
            lastReplyAt: data.lastReplyAt?.toDate() ?? new Date(),
            createdAt: data.createdAt?.toDate() ?? new Date(),
            categorySlug: data.categorySlug,
          };
        });
        setThreads(results);
      } catch (err) {
        console.error("Failed to fetch user posts:", err);
      } finally {
        setLoadingPosts(false);
      }
    };

    fetchPosts();
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const displayName = user.displayName || "Anonymous";
  const memberSince = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex flex-col items-center space-y-4">
        <InitialAvatar name={displayName} size="lg" />
        <h1 className="text-2xl font-bold">{displayName}</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <p className="text-xs text-muted-foreground">Member since {memberSince}</p>
      </div>

      <div className="mt-10 space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Stats</h2>
          <div className="mt-2 rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              Posts: <span className="font-medium text-foreground">{threads.length}</span>
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold">My Posts</h2>
          <div className="mt-2 space-y-3">
            {loadingPosts ? (
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : threads.length === 0 ? (
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  You haven't posted yet.{" "}
                  <Link to="/forum" className="text-primary hover:underline">
                    Join the discussion!
                  </Link>
                </p>
              </div>
            ) : (
              threads.map((thread) => (
                <ThreadCard key={thread.id} thread={thread} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
