import { Link } from "react-router-dom";
import { format } from "date-fns";
import { posts } from "@/content/blog";
import SEO from "@/components/SEO";
import { SITE_URL } from "@/config/site";

const readTime = (content: string) => {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
};

const Blog = () => {
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "GERDBuddy Blog",
    description: "Articles about managing GERD, identifying trigger foods, and living well with acid reflux.",
    url: `${SITE_URL}/blog`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((post, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/blog/${post.slug}`,
        name: post.title,
      })),
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${SITE_URL}/blog`,
      },
    ],
  };

  return (
    <div className="bg-gradient-to-b from-primary/10 via-background to-background text-foreground">
      <SEO
        title="Blog"
        description="Articles about managing GERD, identifying trigger foods, and living well with acid reflux. Tips, guides, and insights from GERDBuddy."
        path="/blog"
        jsonLd={[collectionSchema, breadcrumbSchema]}
      />

      <div className="mx-auto w-full max-w-screen-xl px-4 py-12 space-y-8">
        <header className="space-y-2 opacity-0 animate-fade-in">
          <h1 className="text-3xl font-display font-bold">Blog</h1>
          <p className="text-muted-foreground">
            Guides and tips for managing GERD, understanding your triggers, and feeling your best.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post, i) => (
            <Link key={post.slug} to={`/blog/${post.slug}`} className="block group">
              <article
                className={`card-elevated p-6 h-full flex flex-col space-y-3 transition-all duration-200 group-hover:shadow-lg group-hover:border-primary/30 opacity-0 animate-slide-up stagger-${Math.min(i + 1, 4)}`}
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <time dateTime={post.date}>
                    {format(new Date(post.date), "MMMM d, yyyy")}
                  </time>
                  <span>&middot;</span>
                  <span>{readTime(post.content)} min read</span>
                </div>
                <h2 className="text-lg font-display font-semibold group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed flex-1">
                  {post.description}
                </p>
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-block text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            </Link>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="card-elevated p-8 text-center text-muted-foreground">
            <p>No articles yet. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Blog;
