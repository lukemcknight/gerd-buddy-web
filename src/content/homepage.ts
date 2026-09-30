import { APP, SITE_URL } from "../config/site";
import homeFaqs from "./home-faqs.json";
import { resolveFacts } from "../lib/facts";

// Shared by the interactive homepage and static HTML publishing.
export const HOME = {
  "title": "GERD Food & Symptom Tracker for iPhone and iPad",
  "description": "Track meals and symptoms, scan food and restaurant menus, and explore personal reflux patterns with GERDBuddy. Available on iPhone and iPad with a 3-day trial.",
  "heroLines": [
    "Understand your reflux.",
    "Find your patterns."
  ],
  "intro": "Log meals and symptoms, scan food before you eat, and explore patterns in your reflux. GERDBuddy brings your notes and guided flare support together in one app.",
  "featuresHeading": "Tools for tracking meals, symptoms, and reflux patterns",
  "founder": "I built GERDBuddy because I know how frustrating it is to manage GERD without clear answers. It started as a simple tracking app and has grown into a relief-first companion — and a community resource — for everyone dealing with acid reflux. Whether you're newly diagnosed or have been managing symptoms for years, you deserve better tools and a supportive community to help you figure out what works for your body.",
  "ctaHeading": "Get to know your reflux patterns"
};

export const faqItems = [...homeFaqs.product, ...homeFaqs.general].map((f) => ({
  q: f.q,
  a: resolveFacts(f.a),
}));

export const bigFeatures = [
  {
    eyebrow: "AI Food Scanner",
    title: "Scan meals for possible triggers",
    body: "Take a meal photo for an estimated reflux risk and possible trigger ingredients. A scan can guide your questions, but cannot predict exactly how you will feel.",
    points: ["Estimated reflux risk", "Highlights possible trigger ingredients", "Plain-language analysis"],
    image: "/screens/scan.png",
  },
  {
    eyebrow: "Pattern Insights",
    title: "Explore patterns in your logs",
    body: "Review symptom trends and suspected triggers alongside your logged meals. These associations can help you prepare questions for your clinician.",
    points: ["7-day severity trends", "Triggers ranked by confidence", "Patterns from your own logs"],
    image: "/screens/insights.png",
  },
  {
    eyebrow: "Ask GERDBuddy AI",
    title: "Answers grounded in your own data",
    body: "Ask questions about your logged meals and symptoms, with context from your own history. AI answers may be inaccurate and are not a substitute for medical advice.",
    points: ["Personalized to your history", "Uses relevant logged context", "There whenever a craving hits"],
    image: "/screens/ai.png",
  },
];

export const moreFeatures = [
  {
    title: "Guided flare support",
    body: "Guided breathing and practical comfort steps to use during a flare.",
    image: "/screens/sos.png",
  },
  {
    title: "Reflux-conscious recipes",
    body: "Low-acid, low-fat meal ideas, sorted by meal. Individual tolerance varies.",
    image: "/screens/recipes.png",
  },
  {
    title: "Doctor-ready reports",
    body: "A PDF of your logged symptoms, suspected triggers, and patterns for your next appointment.",
    image: "/screens/report.png",
  },
  {
    title: "Meds and reminders",
    body: "Track PPIs and antacids, set reminders, and log every dose in seconds.",
    image: "/screens/medication.png",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "GERDBuddy",
  url: SITE_URL,
  logo: `${SITE_URL}/gerdbuddy-mark.png`,
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
  description: HOME.description,
  publisher: {
    "@type": "Organization",
    name: "GERDBuddy",
  },
};

const softwareAppSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: APP.name,
  operatingSystem: APP.operatingSystem,
  applicationCategory: APP.applicationCategory,
  applicationSubCategory: APP.applicationSubCategory,
  url: APP.url,
  installUrl: APP.url,
  description: APP.shortDescription,
  featureList: APP.featureList,
  screenshot: APP.screenshots.urls,
  contentRating: APP.contentRating,
  publisher: { "@type": "Organization", name: "GERDBuddy" },
  // Real numbers only. Both come from config/app-facts.json, which records where
  // each value was verified and how to re-check it.
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: APP.rating.value,
    ratingCount: APP.rating.count,
    bestRating: 5,
    worstRating: 1,
  },
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: APP.pricing.monthlyUsd,
    highPrice: APP.pricing.annualUsd,
    offerCount: 2,
    offers: [
      {
        "@type": "Offer",
        name: "GERDBuddy Pro, monthly",
        price: APP.pricing.monthlyUsd,
        priceCurrency: "USD",
        url: APP.url,
        category: "subscription",
        eligibleDuration: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" },
      },
      {
        "@type": "Offer",
        name: "GERDBuddy Pro, annual",
        price: APP.pricing.annualUsd,
        priceCurrency: "USD",
        url: APP.url,
        category: "subscription",
        eligibleDuration: { "@type": "QuantitativeValue", value: 1, unitCode: "ANN" },
      },
    ],
  },
};

export const homepageSchema = [faqSchema, organizationSchema, webSiteSchema, softwareAppSchema];
