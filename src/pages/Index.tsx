import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Apple,
  ScanLine,
  TrendingUp,
  Sparkles,
  HeartPulse,
  BookOpen,
  FileText,
  Pill,
  MessageSquare,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { posts } from "@/content/blog";
import { HOME, bigFeatures as featureCopy, moreFeatures as moreFeatureCopy, faqItems, homepageSchema } from "@/content/homepage";
import SEO from "@/components/SEO";
import { APP_STORE_URL, FORUM_CATEGORIES, APP } from "@/config/site";


const latestPosts = posts.slice(0, 3);
const bigFeatures = featureCopy.map((feature, i) => ({ ...feature, icon: [ScanLine, TrendingUp, Sparkles][i] }));
const moreFeatures = moreFeatureCopy.map((feature, i) => ({ ...feature, icon: [HeartPulse, BookOpen, FileText, Pill][i] }));

const trustBadges = [
  { icon: Apple, label: "On the App Store" },
  { icon: Sparkles, label: "AI-powered insights" },
  { icon: ShieldCheck, label: "Private by design" },
  { icon: HeartPulse, label: "Built for flares" },
];

interface ForumThread {
  id: string;
  title: string;
  categorySlug: string;
  authorName: string;
  createdAt: { toDate: () => Date } | null;
}

const Index = () => {
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const q = query(
          collection(db, "threads"),
          orderBy("createdAt", "desc"),
          limit(5)
        );
        const snapshot = await getDocs(q);
        const results: ForumThread[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title,
          categorySlug: doc.data().categorySlug,
          authorName: doc.data().authorName,
          createdAt: doc.data().createdAt,
        }));
        setThreads(results);
      } catch (err) {
        console.error("Failed to fetch forum threads:", err);
      } finally {
        setThreadsLoading(false);
      }
    };
    fetchThreads();
  }, []);

  return (
    <div className="text-foreground">
      <SEO
        title={HOME.title}
        description={HOME.description}
        path="/"
        jsonLd={homepageSchema}
      />

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-grain">
        {/* Ambient blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
          <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-primary/10 blur-3xl animate-drift" />
          <div className="absolute top-1/3 -right-28 w-[26rem] h-[26rem] rounded-full bg-accent/10 blur-3xl animate-drift" style={{ animationDelay: "-6s" }} />
          <div className="absolute bottom-0 left-1/4 w-[22rem] h-[22rem] rounded-full bg-warning/10 blur-3xl animate-drift" style={{ animationDelay: "-12s" }} />
        </div>

        <div className="relative mx-auto w-full max-w-screen-xl px-4 pt-14 pb-16 md:pt-20 md:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Copy */}
            <div className="lg:col-span-6 space-y-6 opacity-0 animate-fade-in">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-sm font-medium text-primary">
                <HeartPulse className="w-4 h-4" />
                Relief-first GERD tracking
              </span>

              <h1 className="font-display font-semibold text-5xl md:text-6xl lg:text-[4.25rem] leading-[1.04] tracking-tight text-balance">
                {HOME.heroLines[0]}
                <br />
                <span className="text-primary">{HOME.heroLines[1]}</span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
                {HOME.intro}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Apple className="w-5 h-5" />
                  Download on iOS
                </a>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-7 py-3.5 text-base font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  See how it works
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>

              <p className="text-sm text-muted-foreground">{APP.pricing.summary}</p>

              <div className="flex flex-wrap gap-x-6 gap-y-2 pt-3">
                {trustBadges.map((badge) => (
                  <span key={badge.label} className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <badge.icon className="w-4 h-4 text-primary" />
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Hero devices */}
            <div className="lg:col-span-6 relative opacity-0 animate-slide-up stagger-1">
              <div className="relative mx-auto max-w-md lg:max-w-none flex items-end justify-center">
                {/* glow plate */}
                <div aria-hidden className="absolute inset-x-6 bottom-6 top-10 rounded-[3rem] bg-gradient-to-b from-primary/15 to-accent/10 blur-2xl" />
                <img
                  src="/screens/scan.png"
                  alt="GERDBuddy meal scanner screen"
                  className="relative w-[44%] max-w-[220px] -mr-6 mb-8 rotate-[-6deg] drop-shadow-2xl animate-float-slow"
                  loading="eager"
                />
                <img
                  src="/screens/sos.png"
                  alt="GERDBuddy flare support screen showing a guided breathing exercise"
                  className="relative z-10 w-[56%] max-w-[280px] drop-shadow-2xl animate-float"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-screen-xl px-4 pb-20 space-y-24 md:space-y-32">

        {/* ===== Big feature rows ===== */}
        <section id="features" className="space-y-20 md:space-y-28 pt-4 scroll-mt-20">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">What's inside</p>
            <h2 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-balance">
              {HOME.featuresHeading}
            </h2>
          </div>

          {bigFeatures.map((feature, i) => (
            <div
              key={feature.title}
              className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center"
            >
              {/* Phone */}
              <div className={`relative flex justify-center ${i % 2 === 1 ? "lg:order-2" : ""}`}>
                <div aria-hidden className="absolute inset-8 rounded-[3rem] bg-secondary blur-2xl" />
                <img
                  src={feature.image}
                  alt={`GERDBuddy ${feature.title} screen`}
                  className="relative w-[62%] max-w-[300px] drop-shadow-2xl"
                  loading="lazy"
                />
              </div>

              {/* Text */}
              <div className={`space-y-5 ${i % 2 === 1 ? "lg:order-1" : ""}`}>
                <div className="inline-flex items-center gap-2.5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <feature.icon className="w-5 h-5" />
                  </span>
                  <span className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {feature.eyebrow}
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-display font-semibold tracking-tight text-balance">
                  {feature.title}
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                  {feature.body}
                </p>
                <ul className="space-y-2.5 pt-1">
                  {feature.points.map((point) => (
                    <li key={point} className="flex items-center gap-3 text-foreground">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </span>
                      <span className="text-[0.975rem]">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </section>

        {/* ===== More features bento ===== */}
        <section className="space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">And so much more</p>
            <h2 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-balance">
              From the first twinge to your next check-up
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {moreFeatures.map((feature) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-3xl border border-border bg-card p-7 flex items-center gap-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex-1 space-y-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <feature.icon className="w-5 h-5" />
                  </span>
                  <h3 className="text-xl font-display font-semibold tracking-tight">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.body}</p>
                </div>
                <div className="relative shrink-0 w-24 sm:w-28 self-end -mb-7">
                  <div aria-hidden className="absolute inset-0 -top-4 rounded-full bg-secondary blur-xl" />
                  <img
                    src={feature.image}
                    alt={`GERDBuddy ${feature.title} screen`}
                    className="relative w-full drop-shadow-xl translate-y-4 transition-transform duration-300 group-hover:translate-y-2"
                    loading="lazy"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Beyond the app: content + community ===== */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/blog"
            className="group rounded-3xl border border-border bg-card p-8 space-y-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BookOpen className="w-6 h-6" />
            </span>
            <h3 className="text-2xl font-display font-semibold tracking-tight">GERD articles</h3>
            <p className="text-muted-foreground leading-relaxed">
              {latestPosts[0]
                ? `Latest: ${latestPosts[0].title}`
                : "In-depth, plain-English guides on trigger foods, medications, and living well with GERD."}
            </p>
            <span className="inline-flex items-center gap-1.5 text-primary font-semibold group-hover:gap-2.5 transition-all">
              Read the blog <ArrowRight className="w-4 h-4" />
            </span>
          </Link>

          <Link
            to="/forum"
            className="group rounded-3xl border border-border bg-card p-8 space-y-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <MessageSquare className="w-6 h-6" />
            </span>
            <h3 className="text-2xl font-display font-semibold tracking-tight">Community forum</h3>
            <p className="text-muted-foreground leading-relaxed">
              Ask questions, share what works, and connect with people who actually understand life with reflux.
            </p>
            <span className="inline-flex items-center gap-1.5 text-accent font-semibold group-hover:gap-2.5 transition-all">
              Join the conversation <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </section>

        {/* ===== Latest activity ===== */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Recent Blog Posts */}
          <div className="space-y-4">
            <h2 className="text-2xl font-display font-semibold tracking-tight">Recent blog posts</h2>
            <div className="space-y-3">
              {latestPosts.map((post) => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="block group rounded-2xl border border-border bg-card p-5 space-y-1 transition-all duration-200 hover:border-primary/30 hover:shadow-sm"
                >
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(post.date), "MMMM d, yyyy")}
                  </p>
                  <h3 className="text-base font-display font-semibold group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-muted-foreground text-sm line-clamp-2">{post.description}</p>
                </Link>
              ))}
            </div>
            <Link to="/blog" className="inline-flex items-center gap-1.5 text-primary text-sm font-semibold hover:gap-2.5 transition-all">
              View all articles <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Recent Forum Threads */}
          <div className="space-y-4">
            <h2 className="text-2xl font-display font-semibold tracking-tight">Recent forum threads</h2>
            {threadsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-2 animate-pulse">
                    <div className="h-3 bg-muted rounded w-1/4" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
                <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  Be the first to start a discussion!
                </p>
                <Link to="/forum" className="text-primary text-sm font-semibold hover:underline">
                  Visit the forum &rarr;
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {threads.map((thread) => {
                  const category = FORUM_CATEGORIES.find((c) => c.slug === thread.categorySlug);
                  return (
                    <Link
                      key={thread.id}
                      to={`/forum/${thread.categorySlug}/${thread.id}`}
                      className="block group rounded-2xl border border-border bg-card p-5 space-y-1 transition-all duration-200 hover:border-primary/30 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {category && <span>{category.name}</span>}
                        {category && <span>&middot;</span>}
                        <span>{thread.authorName}</span>
                        {thread.createdAt && (
                          <>
                            <span>&middot;</span>
                            <span>{formatDistanceToNow(thread.createdAt.toDate(), { addSuffix: true })}</span>
                          </>
                        )}
                      </div>
                      <h3 className="text-base font-display font-semibold group-hover:text-primary transition-colors">
                        {thread.title}
                      </h3>
                    </Link>
                  );
                })}
              </div>
            )}
            <Link to="/forum" className="inline-flex items-center gap-1.5 text-primary text-sm font-semibold hover:gap-2.5 transition-all">
              Visit the forum <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section className="space-y-4">
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-3xl md:text-4xl font-display font-semibold tracking-tight">Frequently asked questions</h2>
            <p className="text-muted-foreground">Everything you need to know about GERD, triggers, and GERDBuddy.</p>
          </div>

          <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto space-y-3 [&>div]:bg-card [&>div]:rounded-2xl [&>div]:px-5 [&>div]:border [&>div]:border-border">
            {faqItems.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger>{faq.q}</AccordionTrigger>
                <AccordionContent>{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* ===== Founder ===== */}
        <section className="max-w-3xl mx-auto text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-display font-semibold tracking-tight">Why GERDBuddy?</h2>
          <p className="text-muted-foreground leading-relaxed text-lg">
            {HOME.founder}
          </p>
        </section>

        {/* ===== Final CTA ===== */}
        <section className="relative overflow-hidden rounded-[2rem] bg-primary text-primary-foreground px-6 py-14 md:px-16 md:py-20 text-center">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-20 -right-10 w-72 h-72 rounded-full bg-primary-foreground/5 blur-3xl" />
            <div className="absolute -bottom-24 -left-10 w-80 h-80 rounded-full bg-accent/20 blur-3xl" />
          </div>
          <div className="relative space-y-6 max-w-2xl mx-auto">
            <img src="/gerdbuddy-mark-light.png" alt="" className="mx-auto w-14 h-14 object-contain" />
            <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-balance text-primary-foreground">
              {HOME.ctaHeading}
            </h2>
            <p className="text-lg text-primary-foreground/80 max-w-xl mx-auto">
              {APP.pricing.summary}
            </p>
            <div className="flex justify-center pt-1">
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-foreground px-8 py-4 text-base font-semibold text-primary shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
              >
                <Apple className="w-5 h-5" />
                Download on the App Store
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;
