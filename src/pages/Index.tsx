import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Mail, LifeBuoy } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-background text-foreground">
      <header className="mx-auto w-full max-w-3xl px-4 pt-10 pb-6 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 flex items-center justify-center">
            <img src="/turtle.png" alt="GERDBuddy turtle mascot" className="w-16 h-16 rounded-2xl object-cover" />
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
                If you’re experiencing issues or have questions, reach out and we’ll get back to you.
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
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-16 space-y-10">
        <section className="card-elevated p-6 space-y-4">
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

        <section className="card-elevated p-6 space-y-4">
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
          </Accordion>
        </section>

        <section className="card-elevated p-6 space-y-3">
          <h2 className="text-2xl font-display font-semibold">Privacy Policy</h2>
          <p className="text-muted-foreground">
            We respect your privacy and keep things transparent. Read how data is handled, stored, and protected in the full
            policy below.
          </p>
          <Link to="/privacy" className="text-primary font-semibold hover:underline">
            View Privacy Policy
          </Link>
        </section>
      </main>

      <footer className="border-t border-border/70 bg-white/70 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 space-y-2 text-center text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">© 2025 Luke McKnight</p>
          <p>GERDBuddy is not a substitute for professional medical advice.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
