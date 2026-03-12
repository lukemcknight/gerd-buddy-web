import { useState, useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Calendar, User, Clock, ChevronRight } from "lucide-react";
import { posts } from "@/content/blog";
import SEO from "@/components/SEO";
import { SITE_URL } from "@/config/site";

const readTime = (content: string) => {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
};

const wordCount = (content: string) => {
  return content.trim().split(/\s+/).length;
};

const getRelatedPosts = (currentSlug: string, currentTags?: string[]) => {
  if (!currentTags || currentTags.length === 0) {
    return posts.filter((p) => p.slug !== currentSlug).slice(0, 3);
  }
  const scored = posts
    .filter((p) => p.slug !== currentSlug)
    .map((p) => ({
      post: p,
      score: (p.tags || []).filter((t) => currentTags.includes(t)).length,
    }))
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((s) => s.post);
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = posts.find((p) => p.slug === slug);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const relatedPosts = getRelatedPosts(post.slug, post.tags);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.dateModified || post.date,
    wordCount: wordCount(post.content),
    articleSection: post.category || "GERD Management",
    keywords: post.tags?.join(", "),
    author: {
      "@type": "Organization",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "GERDBuddy",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/turtle.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${post.slug}`,
    },
    image: post.image || `${SITE_URL}/turtle.png`,
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [".prose h1", ".prose p:first-of-type"],
    },
  };

  const medicalWebPageSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: post.title,
    description: post.description,
    url: `${SITE_URL}/blog/${post.slug}`,
    about: {
      "@type": "MedicalCondition",
      name: "Gastroesophageal Reflux Disease (GERD)",
      alternateName: "GERD",
    },
    medicalAudience: {
      "@type": "MedicalAudience",
      audienceType: "Patient",
    },
    lastReviewed: post.dateModified || post.date,
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
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `${SITE_URL}/blog/${post.slug}`,
      },
    ],
  };

  return (
    <div className="bg-background text-foreground">
      {/* Reading progress bar */}
      <div className="fixed top-14 left-0 right-0 z-40 h-0.5 bg-border/30">
        <div
          className="h-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <SEO
        title={post.title}
        description={post.description}
        path={`/blog/${post.slug}`}
        image={post.image}
        type="article"
        publishedTime={post.date}
        modifiedTime={post.dateModified || post.date}
        author={post.author}
        section={post.category}
        tags={post.tags}
        jsonLd={[articleSchema, medicalWebPageSchema, breadcrumbSchema]}
      />

      <article className="mx-auto w-full max-w-3xl px-4 py-12 space-y-8">
        {/* Visible breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground opacity-0 animate-fade-in">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/blog" className="hover:text-primary transition-colors">Blog</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground truncate max-w-[200px] sm:max-w-none">{post.title}</span>
        </nav>

        <nav className="opacity-0 animate-fade-in">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-primary font-semibold hover:underline text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to all articles
          </Link>
        </nav>

        <header className="space-y-4 opacity-0 animate-slide-up stagger-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            GERDBuddy Blog
          </p>
          <h1 className="text-3xl sm:text-4xl font-display font-bold leading-tight">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <time dateTime={post.date}>
                {format(new Date(post.date), "MMMM d, yyyy")}
              </time>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {post.author}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {readTime(post.content)} min read
            </span>
            {post.dateModified && post.dateModified !== post.date && (
              <span className="inline-flex items-center gap-1.5 text-xs">
                Updated{" "}
                <time dateTime={post.dateModified}>
                  {format(new Date(post.dateModified), "MMM d, yyyy")}
                </time>
              </span>
            )}
          </div>
        </header>

        <div className="prose prose-slate max-w-none prose-headings:font-display prose-headings:font-semibold prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-p:leading-relaxed prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline opacity-0 animate-slide-up stagger-2">
          <ReactMarkdown
            components={{
              h2: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
              h3: ({ children, ...props }) => <h3 {...props}>{children}</h3>,
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>

        {/* CTA Section */}
        <section className="card-elevated p-6 sm:p-8 space-y-4 text-center opacity-0 animate-slide-up stagger-3">
          <div className="w-16 h-16 mx-auto">
            <img
              src="/turtle.png"
              alt="GERDBuddy mascot"
              width={64}
              height={64}
              loading="lazy"
              className="w-full h-full rounded-2xl object-cover"
            />
          </div>
          <h2 className="text-2xl font-display font-semibold">
            Start Tracking Your Triggers Today
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            GERDBuddy helps you log meals, track symptoms, and discover your personal GERD
            triggers — all in a simple, friendly app.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <a
              href="https://apps.apple.com/us/app/gerdbuddy-gerd-food-scanner/id6756620910"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary-gradient inline-flex items-center gap-2"
            >
              Download on the App Store
            </a>
          </div>
        </section>

        {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <section className="space-y-4 pt-4 opacity-0 animate-slide-up stagger-4">
            <h2 className="text-2xl font-display font-semibold">More Articles</h2>
            <div className="grid gap-4">
              {relatedPosts.map((related) => (
                <Link
                  key={related.slug}
                  to={`/blog/${related.slug}`}
                  className="block group"
                >
                  <div className="card-elevated p-5 space-y-1 transition-all duration-200 group-hover:shadow-lg group-hover:border-primary/30">
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(related.date), "MMMM d, yyyy")}
                    </p>
                    <h3 className="text-lg font-display font-semibold group-hover:text-primary transition-colors">
                      {related.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {related.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
};

export default BlogPost;
