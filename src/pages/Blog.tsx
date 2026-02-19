import { Link } from "react-router-dom";
import { format } from "date-fns";
import { BookOpen } from "lucide-react";
import { posts } from "@/content/blog";
import SEO from "@/components/SEO";

const readTime = (content: string) => {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
};

const Blog = () => {
  return (
    <div className="bg-gradient-to-b from-primary/10 via-background to-background text-foreground">
      <SEO
        title="Blog"
        description="Articles about managing GERD, identifying trigger foods, and living well with acid reflux. Tips, guides, and insights from GERDBuddy."
        path="/blog"
      />

      <div className="mx-auto w-full max-w-3xl px-4 py-12 space-y-8">
        <header className="space-y-2 opacity-0 animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">GERDBuddy</p>
          <h1 className="text-3xl font-display font-bold">Blog</h1>
          <p className="text-muted-foreground">
            Guides and tips for managing GERD, understanding your triggers, and feeling your best.
          </p>
        </header>

        <div className="space-y-4">
          {posts.map((post, i) => (
            <Link key={post.slug} to={`/blog/${post.slug}`} className="block group">
              <article
                className={`card-elevated p-6 space-y-2 transition-all duration-200 group-hover:shadow-lg group-hover:border-primary/30 opacity-0 animate-slide-up stagger-${Math.min(i + 1, 4)}`}
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BookOpen className="w-4 h-4" />
                  <time dateTime={post.date}>
                    {format(new Date(post.date), "MMMM d, yyyy")}
                  </time>
                  <span>&middot;</span>
                  <span>{readTime(post.content)} min read</span>
                  <span>&middot;</span>
                  <span>{post.author}</span>
                </div>
                <h2 className="text-xl font-display font-semibold group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {post.description}
                </p>
                <span className="inline-block text-primary text-sm font-semibold group-hover:underline">
                  Read more &rarr;
                </span>
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
