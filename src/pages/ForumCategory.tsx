import { useState, useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { collection, query, where, orderBy, limit, getDocs, startAfter, DocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { FORUM_CATEGORIES } from "@/config/site";
import SEO from "@/components/SEO";
import ForumBreadcrumb from "@/components/ForumBreadcrumb";
import ThreadCard from "@/components/ThreadCard";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";

interface Thread {
  id: string;
  title: string;
  authorName: string;
  replyCount: number;
  lastReplyAt: Date;
  createdAt: Date;
  categorySlug: string;
}

const PAGE_SIZE = 20;

const ForumCategory = () => {
  const { category } = useParams<{ category: string }>();
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const categoryInfo = FORUM_CATEGORIES.find((c) => c.slug === category);

  useEffect(() => {
    if (!categoryInfo) return;

    const fetchThreads = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "threads"),
          where("categorySlug", "==", category),
          orderBy("lastReplyAt", "desc"),
          limit(PAGE_SIZE)
        );
        const snapshot = await getDocs(q);
        const fetchedThreads: Thread[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            authorName: data.authorName,
            replyCount: data.replyCount,
            lastReplyAt: data.lastReplyAt?.toDate() ?? new Date(),
            createdAt: data.createdAt?.toDate() ?? new Date(),
            categorySlug: data.categorySlug,
          };
        });
        setThreads(fetchedThreads);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] ?? null);
        setHasMore(snapshot.docs.length === PAGE_SIZE);
      } catch (err) {
        console.error("Error fetching threads:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchThreads();
  }, [category, categoryInfo]);

  const loadMore = async () => {
    if (!lastDoc || !categoryInfo) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "threads"),
        where("categorySlug", "==", category),
        orderBy("lastReplyAt", "desc"),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );
      const snapshot = await getDocs(q);
      const moreThreads: Thread[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          authorName: data.authorName,
          replyCount: data.replyCount,
          lastReplyAt: data.lastReplyAt?.toDate() ?? new Date(),
          createdAt: data.createdAt?.toDate() ?? new Date(),
          categorySlug: data.categorySlug,
        };
      });
      setThreads((prev) => [...prev, ...moreThreads]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] ?? null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("Error loading more threads:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  if (!categoryInfo) {
    return <Navigate to="/forum" replace />;
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8 space-y-6">
      <SEO
        title={`${categoryInfo.name} - Community Forum`}
        description={categoryInfo.description}
        path={`/forum/${category}`}
      />

      <ForumBreadcrumb
        items={[
          { label: "Forum", to: "/forum" },
          { label: categoryInfo.name },
        ]}
      />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">{categoryInfo.name}</h1>
          <p className="text-muted-foreground mt-1">{categoryInfo.description}</p>
        </div>
        <Link to={user ? `/forum/${category}/new` : "/login"}>
          <Button size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            New Thread
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : threads.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-muted-foreground">No threads yet. Be the first to start a discussion!</p>
          <Link to={user ? `/forum/${category}/new` : "/login"}>
            <Button variant="outline" className="gap-1.5">
              <Plus className="w-4 h-4" />
              Start a Thread
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} />
          ))}

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ForumCategory;
