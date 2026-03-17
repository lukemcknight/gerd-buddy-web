import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FORUM_CATEGORIES, SITE_URL } from "@/config/site";
import SEO from "@/components/SEO";
import ForumBreadcrumb from "@/components/ForumBreadcrumb";
import { MessageSquare, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CategoryData {
  slug: string;
  name: string;
  description: string;
  threadCount: number;
  lastActivityAt: Date | null;
}

const Forum = () => {
  const [categories, setCategories] = useState<CategoryData[]>(
    FORUM_CATEGORIES.map((c) => ({
      ...c,
      threadCount: 0,
      lastActivityAt: null,
    }))
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snap = await getDocs(collection(db, "forums"));
        if (snap.empty) {
          setLoading(false);
          return;
        }

        const firestoreData = new Map<string, { threadCount: number; lastActivityAt: Date | null }>();
        snap.forEach((doc) => {
          const data = doc.data();
          firestoreData.set(doc.id, {
            threadCount: data.threadCount ?? 0,
            lastActivityAt: data.lastActivityAt?.toDate?.() ?? null,
          });
        });

        setCategories(
          FORUM_CATEGORIES.map((c) => {
            const fsData = firestoreData.get(c.slug);
            return {
              ...c,
              threadCount: fsData?.threadCount ?? 0,
              lastActivityAt: fsData?.lastActivityAt ?? null,
            };
          })
        );
      } catch (err) {
        console.error("Failed to fetch forum categories:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Forum", item: `${SITE_URL}/forum` },
    ],
  };

  return (
    <div className="bg-gradient-to-b from-primary/10 via-background to-background text-foreground">
      <SEO
        title="Community Forum"
        description="Join the GERDBuddy community forum to discuss GERD triggers, treatments, lifestyle tips, and connect with others managing acid reflux."
        path="/forum"
        jsonLd={[breadcrumbSchema]}
      />

      <div className="mx-auto w-full max-w-screen-xl px-4 py-12 space-y-8">
        <header className="space-y-4 opacity-0 animate-fade-in">
          <ForumBreadcrumb items={[{ label: "Forum" }]} />
          <div className="space-y-2">
            <h1 className="text-3xl font-display font-bold">Community Forum</h1>
            <p className="text-muted-foreground">
              Connect with others, share experiences, and find support for managing GERD.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, i) => (
            <Link key={category.slug} to={`/forum/${category.slug}`} className="block group">
              <article
                className={`card-elevated p-6 h-full flex flex-col space-y-3 transition-all duration-200 group-hover:shadow-lg group-hover:border-primary/30 opacity-0 animate-slide-up stagger-${Math.min(i + 1, 4)}`}
              >
                <h2 className="text-lg font-display font-semibold group-hover:text-primary transition-colors">
                  {category.name}
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed flex-1">
                  {category.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {loading ? (
                      <span className="inline-block w-6 h-3 bg-muted animate-pulse rounded" />
                    ) : (
                      <span>{category.threadCount} {category.threadCount === 1 ? "thread" : "threads"}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {loading ? (
                      <span className="inline-block w-16 h-3 bg-muted animate-pulse rounded" />
                    ) : category.lastActivityAt ? (
                      <span>{formatDistanceToNow(category.lastActivityAt, { addSuffix: true })}</span>
                    ) : (
                      <span>No activity yet</span>
                    )}
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Forum;
