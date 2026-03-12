import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Mail, LifeBuoy, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { posts } from "@/content/blog";
import SEO from "@/components/SEO";
import { SITE_URL } from "@/config/site";

const latestPost = posts[0];

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

const Index = () => {
  return (
    <div className="bg-gradient-to-b from-primary/10 via-background to-background text-foreground">
      <SEO
        title="Discover Your GERD Triggers"
        description="Track meals and symptoms for 7 days to discover your personal GERD triggers. Identify what causes your acid reflux with AI-powered insights."
        path="/"
        jsonLd={[faqSchema, organizationSchema, webSiteSchema, softwareAppSchema]}
      />
      <header className="mx-auto w-full max-w-3xl px-4 pt-10 pb-6 space-y-6 opacity-0 animate-fade-in">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 flex items-center justify-center">
            <img src="/turtle.png" alt="GERDBuddy turtle mascot" width={64} height={64} className="w-16 h-16 rounded-2xl object-cover" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">GERDBuddy</p>
            <h1 className="text-3xl font-display font-bold leading-tight">
              A simple companion app to help manage GERD symptoms and triggers.
            </h1>
            <p className="text-muted-foreground text-base">
              Friendly, calming support for day-to-day tracking—built to feel as gentle as its mascot.
            </p>
          </div>
        </div>

        {/* App Store CTA */}
        <div className="flex flex-wrap gap-3">
          <a
            href="https://apps.apple.com/us/app/gerdbuddy-gerd-food-scanner/id6756620910"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary-gradient inline-flex items-center gap-2 text-base"
          >
            Download on the App Store
          </a>
        </div>

        <div className="card-elevated p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm uppercase font-semibold text-muted-foreground tracking-wide">Need help?</p>
              <a href="mailto:gerdbuddy2@gmail.com" className="text-lg font-semibold text-foreground hover:underline">
                gerdbuddy2@gmail.com
              </a>
              <p className="text-muted-foreground text-sm">
                If you're experiencing issues or have questions, reach out and we'll get back to you.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="mailto:gerdbuddy2@gmail.com" className="inline-flex">
              <Button size="lg" className="px-6">
                Email Support
              </Button>
            </a>
            <Link to="/privacy" className="inline-flex">
              <Button variant="outline" size="lg" className="px-6">
                Privacy Policy
              </Button>
            </Link>
            <Link to="/terms" className="inline-flex">
              <Button variant="outline" size="lg" className="px-6">
                Terms of Service
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 pb-16 space-y-10">
        <section className="card-elevated p-6 space-y-4 opacity-0 animate-slide-up stagger-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-semibold">Support</h2>
              <p className="text-muted-foreground text-sm">
                Quick answers for App Store review and users installing GERDBuddy.
              </p>
            </div>
          </div>
          <ul className="grid gap-3 text-base text-foreground">
            <li className="p-4 rounded-xl bg-primary/5 border border-border/70">
              <span className="font-semibold">Contact:</span>{" "}
              <a href="mailto:gerdbuddy2@gmail.com" className="text-primary font-medium hover:underline">
                gerdbuddy2@gmail.com
              </a>
            </li>
            <li className="p-4 rounded-xl bg-primary/5 border border-border/70">
              <span className="font-semibold">Hours:</span> Monday–Friday, replies within 1–2 business days.
            </li>
            <li className="p-4 rounded-xl bg-primary/5 border border-border/70">
              <span className="font-semibold">Purpose:</span> GERDBuddy helps track potential triggers and patterns; it does not
              provide medical advice.
            </li>
          </ul>
        </section>

        <section className="card-elevated p-6 space-y-4 opacity-0 animate-slide-up stagger-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-semibold">FAQ</h2>
              <p className="text-muted-foreground text-sm">Simple answers to the most common questions.</p>
            </div>
          </div>

          <Accordion type="single" collapsible className="w-full">
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
          </Accordion>
        </section>

        <section className="card-elevated p-6 space-y-3 opacity-0 animate-slide-up stagger-3">
          <h2 className="text-2xl font-display font-semibold">Legal</h2>
          <p className="text-muted-foreground">
            Read the details on how your data is handled and the terms that govern use of GERDBuddy.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/privacy" className="text-primary font-semibold hover:underline">
              Privacy Policy
            </Link>
            <span className="text-muted-foreground">&bull;</span>
            <Link to="/terms" className="text-primary font-semibold hover:underline">
              Terms of Service
            </Link>
          </div>
        </section>

        {/* Latest from the Blog */}
        {latestPost && (
          <section className="card-elevated p-6 space-y-4 opacity-0 animate-slide-up stagger-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-display font-semibold">Latest from the Blog</h2>
            </div>
            <Link to={`/blog/${latestPost.slug}`} className="block group">
              <div className="p-4 rounded-xl bg-primary/5 border border-border/70 space-y-2 transition-all duration-200 group-hover:border-primary/30 group-hover:shadow-sm">
                <p className="text-sm text-muted-foreground">
                  {format(new Date(latestPost.date), "MMMM d, yyyy")}
                </p>
                <h3 className="text-lg font-display font-semibold group-hover:text-primary transition-colors">
                  {latestPost.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{latestPost.description}</p>
                <span className="inline-block text-primary text-sm font-semibold group-hover:underline">
                  Read more &rarr;
                </span>
              </div>
            </Link>
            <Link to="/blog" className="text-primary text-sm font-semibold hover:underline">
              View all articles &rarr;
            </Link>
          </section>
        )}
      </div>
    </div>
  );
};

export default Index;
