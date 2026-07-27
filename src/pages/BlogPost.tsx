import { useState, useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Calendar, User, Clock, ChevronRight } from "lucide-react";
import { posts } from "@/content/blog";
import faqData from "@/content/blog/faqs.json";
import SEO from "@/components/SEO";
import { SITE_URL, AUTHOR } from "@/config/site";

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

  // AEO data for this post: extractable Q&As and the primary sources behind it.
  // Both live in content/blog/faqs.json so scripts/prerender.js emits the same thing.
  const postFaq = faqData.posts[post.slug as keyof typeof faqData.posts];
  const faqs = postFaq?.faq ?? [];
  const sources = (postFaq?.sources ?? [])
    .map((key) => faqData.sources[key as keyof typeof faqData.sources])
    .filter(Boolean);

  // A named person carries far more weight than an anonymous org byline on
  // medical topics, for search engines and AI answer engines alike.
  const authorName = AUTHOR.person?.name ?? post.author;
  const authorSchema = AUTHOR.person
    ? { "@type": "Person", name: AUTHOR.person.name, jobTitle: AUTHOR.person.jobTitle }
    : { "@type": "Organization", name: post.author };

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
    author: authorSchema,
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
    ...(sources.length && {
      citation: sources.map((s) => ({
        "@type": "CreativeWork",
        name: s.title,
        publisher: { "@type": "Organization", name: s.publisher },
        url: s.url,
      })),
    }),
    ...(AUTHOR.reviewedBy && {
      reviewedBy: { "@type": "Person", name: AUTHOR.reviewedBy.name },
    }),
  };

  const faqSchema = faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

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
        author={authorName}
        section={post.category}
        tags={post.tags}
        jsonLd={[articleSchema, medicalWebPageSchema, breadcrumbSchema, faqSchema].filter(Boolean)}
      />

      <article className="mx-auto w-full max-w-screen-xl px-4 py-12 space-y-8">
        <div className="max-w-prose mx-auto space-y-8">
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
                {authorName}
                {AUTHOR.person?.jobTitle && (
                  <span className="text-xs">({AUTHOR.person.jobTitle})</span>
                )}
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

          {/* Common questions. Visible on the page and mirrored into FAQPage JSON-LD:
              answer engines will not quote an answer that is only in the markup. */}
          {faqs.length > 0 && (
            <section className="space-y-4 opacity-0 animate-slide-up stagger-3">
              <h2 className="text-2xl font-display font-semibold">Common Questions</h2>
              <div className="space-y-3">
                {faqs.map((faq, i) => (
                  <details
                    key={i}
                    className="card-elevated p-5 group"
                    open={i === 0}
                  >
                    <summary className="font-semibold cursor-pointer list-none flex items-start justify-between gap-3">
                      <span>{faq.q}</span>
                      <ChevronRight className="w-4 h-4 mt-1 shrink-0 transition-transform group-open:rotate-90" />
                    </summary>
                    <p className="text-muted-foreground mt-3 leading-relaxed">{faq.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* Sources. Every URL here was fetched and title-verified before being added. */}
          {sources.length > 0 && (
            <section className="space-y-3 opacity-0 animate-slide-up stagger-3">
              <h2 className="text-xl font-display font-semibold">Sources and further reading</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-primary hover:underline"
                    >
                      {source.title}
                    </a>
                    <span>, {source.publisher}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                This article is general information, not medical advice. Talk to your doctor
                about your own symptoms and treatment.
              </p>
            </section>
          )}

          {/* CTA Section */}
          <section className="card-elevated p-6 sm:p-8 space-y-4 text-center opacity-0 animate-slide-up stagger-3">
            <h2 className="text-2xl font-display font-semibold">
              Join the Conversation
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Have thoughts on this topic? Share your experience in the forum.
            </p>
            <div className="flex flex-col items-center gap-3 pt-2">
              <Link
                to="/forum"
                className="btn-primary-gradient inline-flex items-center gap-2"
              >
                Discuss in the Forum
              </Link>
              <p className="text-xs text-muted-foreground">
                Or track your triggers with the{" "}
                <a
                  href="https://apps.apple.com/us/app/gerdbuddy-acid-reflux-relief/id6756620910"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  GERDBuddy app
                </a>
              </p>
            </div>
          </section>
        </div>

        {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <section className="max-w-prose mx-auto space-y-4 pt-4 opacity-0 animate-slide-up stagger-4">
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
