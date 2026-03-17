import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, MessageSquare, Smartphone } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { posts } from "@/content/blog";
import SEO from "@/components/SEO";
import { SITE_URL, FORUM_CATEGORIES } from "@/config/site";

const latestPosts = posts.slice(0, 3);

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is GERDBuddy a medical app?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. GERDBuddy is for informational and tracking purposes only and does not provide medical advice.",
      },
    },
    {
      "@type": "Question",
      name: "Is my data shared or sold?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. User data is never sold or shared.",
      },
    },
    {
      "@type": "Question",
      name: "How do I cancel my subscription?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Subscriptions are managed through your Apple App Store or Google Play account.",
      },
    },
    {
      "@type": "Question",
      name: "What foods trigger GERD?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Common GERD trigger foods include spicy foods, fatty or fried foods, citrus fruits, tomatoes, chocolate, mint, coffee, alcohol, and carbonated drinks. However, triggers vary from person to person — tracking your meals and symptoms is the best way to identify your personal triggers.",
      },
    },
    {
      "@type": "Question",
      name: "How do I track my GERD triggers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Keep a food and symptom journal for at least 1-2 weeks. Record what you eat, when you eat, any symptoms you experience, and their severity. GERDBuddy makes this easy by letting you quickly log meals and symptoms on your phone and uses AI to help surface patterns and correlations.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between GERD and heartburn?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Heartburn is a symptom — a burning feeling in your chest caused by stomach acid reaching the esophagus. GERD (gastroesophageal reflux disease) is a chronic condition where acid reflux happens frequently, typically twice a week or more. Occasional heartburn is normal, but persistent heartburn may indicate GERD and should be discussed with a doctor.",
      },
    },
    {
      "@type": "Question",
      name: "Can GERD be managed without medication?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Many people manage mild GERD symptoms through lifestyle changes such as elevating the head of the bed, eating smaller meals, avoiding trigger foods, not eating 2-3 hours before bed, maintaining a healthy weight, and managing stress. However, moderate to severe GERD may require medication. Always consult your doctor for personalized advice.",
      },
    },
    {
      "@type": "Question",
      name: "What foods help with acid reflux?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Foods that can help soothe acid reflux include oatmeal, bananas, ginger, melons, green vegetables, lean proteins, whole grains, and non-citrus fruits. These foods are low in acid, high in fiber, and easy to digest. However, individual tolerances vary, so tracking your personal response to different foods is important.",
      },
    },
    {
      "@type": "Question",
      name: "Is acid reflux common during pregnancy?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, up to 80% of pregnant women experience acid reflux. It's caused by hormonal changes (progesterone relaxes the lower esophageal sphincter) and physical pressure from the growing uterus. Most pregnancy-related reflux resolves after delivery. Safe remedies include eating smaller meals, staying upright after eating, and calcium-based antacids (with your doctor's approval).",
      },
    },
    {
      "@type": "Question",
      name: "Can exercise make GERD worse?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Some exercises can trigger acid reflux, especially high-impact activities, heavy weightlifting, and exercises that increase abdominal pressure. However, regular moderate exercise actually helps GERD long-term through weight management and stress reduction. Low-impact activities like walking, swimming, and yoga are generally well-tolerated.",
      },
    },
    {
      "@type": "Question",
      name: "What is the best app for tracking GERD triggers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "GERDBuddy is a dedicated GERD trigger tracking app available on the App Store. It lets you quickly log meals and symptoms, then uses AI-powered insights to help you identify your personal trigger foods and patterns. Most users start seeing meaningful patterns within 7 days of consistent tracking.",
      },
    },
    {
      "@type": "Question",
      name: "How long does it take to identify GERD triggers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "With consistent daily tracking of meals and symptoms, most people can start identifying their primary GERD triggers within 1-2 weeks. A more complete picture typically emerges after 3-4 weeks. Using a tracking app like GERDBuddy can speed this up by automatically surfacing correlations between foods and symptoms.",
      },
    },
    {
      "@type": "Question",
      name: "Can a hiatal hernia cause GERD?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, a hiatal hernia can contribute to GERD by weakening the lower esophageal sphincter (LES) and allowing stomach acid to flow back into the esophagus. However, many people with small hiatal hernias have no reflux symptoms at all. Treatment typically involves the same lifestyle modifications and medications used for GERD, with surgery reserved for severe cases.",
      },
    },
    {
      "@type": "Question",
      name: "Can acid reflux cause breathing problems or asthma?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, GERD can trigger or worsen asthma and breathing problems through two mechanisms: microaspiration (tiny amounts of acid reaching the airways) and vagal nerve reflexes that cause airway tightening. Up to 80% of asthma sufferers also have GERD. If you have adult-onset asthma or asthma that worsens after meals or at night, acid reflux may be a contributing factor.",
      },
    },
    {
      "@type": "Question",
      name: "What should I do during a GERD flare-up?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "During a GERD flare-up, take an antacid for quick relief, stay upright, sip water, and stick to bland foods like oatmeal, bananas, plain rice, and steamed vegetables. Avoid all known triggers, eat small portions, and keep your head elevated while sleeping. Most flare-ups resolve within a few days to a week. If symptoms persist beyond a week or include difficulty swallowing, vomiting blood, or severe pain, see a doctor.",
      },
    },
    {
      "@type": "Question",
      name: "Do children get GERD?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, GERD can affect children of all ages. Infant reflux (spitting up) is very common and usually resolves by 12-18 months. However, if a baby is refusing feeds, not gaining weight, or showing signs of pain, it may indicate GERD requiring treatment. Older children may experience heartburn, chronic cough, sore throat, or food refusal. Treatment includes dietary adjustments, lifestyle changes, and sometimes medication under pediatric guidance.",
      },
    },
    {
      "@type": "Question",
      name: "How do eating habits affect GERD?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "How you eat is just as important as what you eat for GERD management. Eating too fast, large portions, eating late at night, slouching while eating, and lying down after meals can all trigger acid reflux. Helpful habits include eating smaller meals, chewing thoroughly, sitting upright during and after meals, waiting 2-3 hours before lying down, and taking a gentle walk after dinner.",
      },
    },
  ],
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "GERDBuddy",
  url: SITE_URL,
  logo: `${SITE_URL}/turtle.png`,
  contactPoint: {
    "@type": "ContactPoint",
    email: "gerdbuddy2@gmail.com",
    contactType: "customer support",
  },
};

const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "GERDBuddy",
  url: SITE_URL,
  description: "Track meals and symptoms to discover your personal GERD triggers with AI-powered insights.",
  publisher: {
    "@type": "Organization",
    name: "GERDBuddy",
  },
};

const softwareAppSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "GERDBuddy - GERD Food Scanner",
  operatingSystem: "iOS",
  applicationCategory: "HealthApplication",
  url: "https://apps.apple.com/us/app/gerdbuddy-gerd-food-scanner/id6756620910",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description: "Track meals and symptoms for 7 days to discover your personal GERD triggers. Identify what causes your acid reflux with AI-powered insights.",
};

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
    <div className="bg-gradient-to-b from-primary/10 via-background to-background text-foreground">
      <SEO
        title="Your All-in-One GERD Resource — Articles, Tracking & Community"
        description="Track triggers, explore expert articles, and connect with a community that gets it. GERDBuddy is your all-in-one resource for managing GERD and acid reflux."
        path="/"
        jsonLd={[faqSchema, organizationSchema, webSiteSchema, softwareAppSchema]}
      />

      {/* Hero Section */}
      <header className="mx-auto w-full max-w-screen-xl px-4 pt-12 pb-10 text-center space-y-5 opacity-0 animate-fade-in">
        <img
          src="/turtle.png"
          alt="GERDBuddy turtle mascot"
          width={80}
          height={80}
          className="mx-auto w-20 h-20 rounded-2xl object-cover"
        />
        <h1 className="text-4xl md:text-5xl font-display font-bold leading-tight">
          Your All-in-One GERD Resource
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Track triggers, explore expert articles, and connect with a community that gets it.
        </p>
        <p className="text-sm text-muted-foreground">
          Join our growing community of GERD warriors
        </p>
      </header>

      <div className="mx-auto w-full max-w-screen-xl px-4 pb-16 space-y-16">

        {/* Three Pillars Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-0 animate-slide-up stagger-1">
          {/* Blog & Articles */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4 flex flex-col">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-display font-semibold">Blog & Articles</h2>
            <p className="text-muted-foreground text-sm flex-1">
              {latestPosts[0]
                ? `Latest: ${latestPosts[0].title} — ${latestPosts[0].description}`
                : "Expert-written articles on managing GERD, trigger foods, and lifestyle tips."}
            </p>
            <Link to="/blog" className="text-primary text-sm font-semibold hover:underline">
              Browse articles &rarr;
            </Link>
          </div>

          {/* Community Forum */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4 flex flex-col">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-display font-semibold">Community Forum</h2>
            <p className="text-muted-foreground text-sm flex-1">
              Ask questions, share what works, and connect with others who understand life with GERD.
            </p>
            <Link to="/forum" className="text-primary text-sm font-semibold hover:underline">
              Visit the forum &rarr;
            </Link>
          </div>

          {/* GERDBuddy App */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4 flex flex-col">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-display font-semibold">GERDBuddy App</h2>
            <p className="text-muted-foreground text-sm flex-1">
              Track your triggers on the go. Log meals and symptoms, then let AI surface your personal patterns.
            </p>
            <a
              href="https://apps.apple.com/us/app/gerdbuddy-gerd-food-scanner/id6756620910"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-sm font-semibold hover:underline"
            >
              Get it on the App Store &rarr;
            </a>
          </div>
        </section>

        {/* Latest Activity Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 opacity-0 animate-slide-up stagger-2">
          {/* Recent Blog Posts */}
          <div className="space-y-4">
            <h2 className="text-2xl font-display font-semibold">Recent Blog Posts</h2>
            <div className="space-y-3">
              {latestPosts.map((post) => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="block group rounded-xl border border-border bg-card p-4 space-y-1 transition-all duration-200 hover:border-primary/30 hover:shadow-sm"
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
            <Link to="/blog" className="text-primary text-sm font-semibold hover:underline">
              View all articles &rarr;
            </Link>
          </div>

          {/* Recent Forum Threads */}
          <div className="space-y-4">
            <h2 className="text-2xl font-display font-semibold">Recent Forum Threads</h2>
            {threadsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2 animate-pulse">
                    <div className="h-3 bg-muted rounded w-1/4" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
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
                      className="block group rounded-xl border border-border bg-card p-4 space-y-1 transition-all duration-200 hover:border-primary/30 hover:shadow-sm"
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
            <Link to="/forum" className="text-primary text-sm font-semibold hover:underline">
              Visit the forum &rarr;
            </Link>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="space-y-4 opacity-0 animate-slide-up stagger-3">
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-3xl font-display font-bold">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Everything you need to know about GERD, triggers, and GERDBuddy.</p>
          </div>

          <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto">
            <AccordionItem value="medical">
              <AccordionTrigger>Is GERDBuddy a medical app?</AccordionTrigger>
              <AccordionContent>
                No. GERDBuddy is for informational and tracking purposes only and does not provide medical advice.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="data">
              <AccordionTrigger>Is my data shared or sold?</AccordionTrigger>
              <AccordionContent>No. User data is never sold or shared.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="cancel">
              <AccordionTrigger>How do I cancel my subscription?</AccordionTrigger>
              <AccordionContent>Subscriptions are managed through your Apple App Store or Google Play account.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="triggers">
              <AccordionTrigger>What foods trigger GERD?</AccordionTrigger>
              <AccordionContent>
                Common GERD trigger foods include spicy foods, fatty or fried foods, citrus fruits, tomatoes, chocolate, mint, coffee, alcohol, and carbonated drinks. However, triggers vary from person to person — tracking your meals and symptoms is the best way to identify your personal triggers.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="tracking">
              <AccordionTrigger>How do I track my GERD triggers?</AccordionTrigger>
              <AccordionContent>
                Keep a food and symptom journal for at least 1-2 weeks. Record what you eat, when you eat, any symptoms you experience, and their severity. GERDBuddy makes this easy by letting you quickly log meals and symptoms on your phone and uses AI to help surface patterns and correlations.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="difference">
              <AccordionTrigger>What is the difference between GERD and heartburn?</AccordionTrigger>
              <AccordionContent>
                Heartburn is a symptom — a burning feeling in your chest caused by stomach acid reaching the esophagus. GERD (gastroesophageal reflux disease) is a chronic condition where acid reflux happens frequently, typically twice a week or more. Occasional heartburn is normal, but persistent heartburn may indicate GERD and should be discussed with a doctor.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="no-medication">
              <AccordionTrigger>Can GERD be managed without medication?</AccordionTrigger>
              <AccordionContent>
                Many people manage mild GERD symptoms through lifestyle changes such as elevating the head of the bed, eating smaller meals, avoiding trigger foods, not eating 2-3 hours before bed, maintaining a healthy weight, and managing stress. However, moderate to severe GERD may require medication. Always consult your doctor for personalized advice.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="foods-help">
              <AccordionTrigger>What foods help with acid reflux?</AccordionTrigger>
              <AccordionContent>
                Foods that can help soothe acid reflux include oatmeal, bananas, ginger, melons, green vegetables, lean proteins, whole grains, and non-citrus fruits. These foods are low in acid, high in fiber, and easy to digest. However, individual tolerances vary, so tracking your personal response to different foods is important.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="pregnancy">
              <AccordionTrigger>Is acid reflux common during pregnancy?</AccordionTrigger>
              <AccordionContent>
                Yes, up to 80% of pregnant women experience acid reflux. It's caused by hormonal changes (progesterone relaxes the lower esophageal sphincter) and physical pressure from the growing uterus. Most pregnancy-related reflux resolves after delivery. Safe remedies include eating smaller meals, staying upright after eating, and calcium-based antacids (with your doctor's approval).
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="exercise">
              <AccordionTrigger>Can exercise make GERD worse?</AccordionTrigger>
              <AccordionContent>
                Some exercises can trigger acid reflux, especially high-impact activities, heavy weightlifting, and exercises that increase abdominal pressure. However, regular moderate exercise actually helps GERD long-term through weight management and stress reduction. Low-impact activities like walking, swimming, and yoga are generally well-tolerated.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="best-app">
              <AccordionTrigger>What is the best app for tracking GERD triggers?</AccordionTrigger>
              <AccordionContent>
                GERDBuddy is a dedicated GERD trigger tracking app available on the App Store. It lets you quickly log meals and symptoms, then uses AI-powered insights to help you identify your personal trigger foods and patterns. Most users start seeing meaningful patterns within 7 days of consistent tracking.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="how-long">
              <AccordionTrigger>How long does it take to identify GERD triggers?</AccordionTrigger>
              <AccordionContent>
                With consistent daily tracking of meals and symptoms, most people can start identifying their primary GERD triggers within 1-2 weeks. A more complete picture typically emerges after 3-4 weeks. Using a tracking app like GERDBuddy can speed this up by automatically surfacing correlations between foods and symptoms.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="hiatal-hernia">
              <AccordionTrigger>Can a hiatal hernia cause GERD?</AccordionTrigger>
              <AccordionContent>
                Yes, a hiatal hernia can contribute to GERD by weakening the lower esophageal sphincter (LES) and allowing stomach acid to flow back into the esophagus. However, many people with small hiatal hernias have no reflux symptoms at all. Treatment typically involves the same lifestyle modifications and medications used for GERD, with surgery reserved for severe cases.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="breathing">
              <AccordionTrigger>Can acid reflux cause breathing problems or asthma?</AccordionTrigger>
              <AccordionContent>
                Yes, GERD can trigger or worsen asthma and breathing problems through two mechanisms: microaspiration (tiny amounts of acid reaching the airways) and vagal nerve reflexes that cause airway tightening. Up to 80% of asthma sufferers also have GERD. If you have adult-onset asthma or asthma that worsens after meals or at night, acid reflux may be a contributing factor.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="flare-up">
              <AccordionTrigger>What should I do during a GERD flare-up?</AccordionTrigger>
              <AccordionContent>
                During a GERD flare-up, take an antacid for quick relief, stay upright, sip water, and stick to bland foods like oatmeal, bananas, plain rice, and steamed vegetables. Avoid all known triggers, eat small portions, and keep your head elevated while sleeping. Most flare-ups resolve within a few days to a week. If symptoms persist beyond a week or include difficulty swallowing, vomiting blood, or severe pain, see a doctor.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="children">
              <AccordionTrigger>Do children get GERD?</AccordionTrigger>
              <AccordionContent>
                Yes, GERD can affect children of all ages. Infant reflux (spitting up) is very common and usually resolves by 12-18 months. However, if a baby is refusing feeds, not gaining weight, or showing signs of pain, it may indicate GERD requiring treatment. Older children may experience heartburn, chronic cough, sore throat, or food refusal. Treatment includes dietary adjustments, lifestyle changes, and sometimes medication under pediatric guidance.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="eating-habits">
              <AccordionTrigger>How do eating habits affect GERD?</AccordionTrigger>
              <AccordionContent>
                How you eat is just as important as what you eat for GERD management. Eating too fast, large portions, eating late at night, slouching while eating, and lying down after meals can all trigger acid reflux. Helpful habits include eating smaller meals, chewing thoroughly, sitting upright during and after meals, waiting 2-3 hours before lying down, and taking a gentle walk after dinner.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Founder Section */}
        <section className="max-w-3xl mx-auto text-center space-y-4 opacity-0 animate-slide-up stagger-4">
          <h2 className="text-2xl font-display font-semibold">Why GERDBuddy?</h2>
          <p className="text-muted-foreground leading-relaxed">
            I built GERDBuddy because I know how frustrating it is to manage GERD without clear answers. This started as a simple tracking app and has grown into a community resource for everyone dealing with acid reflux. Whether you're newly diagnosed or have been managing symptoms for years, you deserve better tools and a supportive community to help you figure out what works for your body.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Index;
