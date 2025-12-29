import { Link } from "react-router-dom";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-4 py-12 space-y-8">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">GERDBuddy</p>
          <h1 className="text-3xl font-display font-bold">Terms of Service</h1>
          <p className="text-muted-foreground">
            These terms describe how you may use GERDBuddy and outline important limitations. By using the app, you agree to
            these terms.
          </p>
        </header>

        <section className="card-elevated p-6 space-y-4">
          <h2 className="text-xl font-display font-semibold">Not medical advice</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>GERDBuddy is for informational and tracking purposes only and is not a medical device.</li>
            <li>It does not diagnose, treat, or provide personalized medical advice.</li>
            <li>For any concerns about GERD or other conditions, consult a licensed healthcare professional.</li>
            <li>If you are in an emergency, contact local emergency services immediately.</li>
          </ul>
        </section>

        <section className="card-elevated p-6 space-y-4">
          <h2 className="text-xl font-display font-semibold">Using GERDBuddy</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>You must be at least 18 years old or have permission from a parent/guardian to use the app.</li>
            <li>Use the app only for personal, non-commercial purposes.</li>
            <li>You are responsible for the accuracy of entries you add and for how you interpret patterns or trends.</li>
            <li>Do not misuse the app, attempt to disrupt its operation, or reverse engineer its code.</li>
          </ul>
        </section>

        <section className="card-elevated p-6 space-y-4">
          <h2 className="text-xl font-display font-semibold">Subscriptions and payments</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>Payments and subscription management are handled by Apple App Store or Google Play.</li>
            <li>Billing, renewals, and cancellations follow the policies of your app store provider.</li>
            <li>Unless required by applicable law, refunds are processed through the app store where you purchased.</li>
          </ul>
        </section>

        <section className="card-elevated p-6 space-y-4">
          <h2 className="text-xl font-display font-semibold">Privacy</h2>
          <p className="text-muted-foreground">
            Your use of GERDBuddy is also governed by our Privacy Policy, which explains how data is handled. The policy is
            available at the link below.
          </p>
          <Link to="/privacy" className="text-primary font-semibold hover:underline">
            Read the Privacy Policy
          </Link>
        </section>

        <section className="card-elevated p-6 space-y-4">
          <h2 className="text-xl font-display font-semibold">Changes and termination</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>We may update these terms to reflect product changes or legal requirements.</li>
            <li>If terms change, continued use of GERDBuddy means you accept the updated terms.</li>
            <li>We may suspend or end access to the app for misuse or violations of these terms.</li>
          </ul>
        </section>

        <section className="card-elevated p-6 space-y-3">
          <h2 className="text-xl font-display font-semibold">Contact</h2>
          <p className="text-muted-foreground">
            Questions about these terms? Email us at{" "}
            <a href="mailto:gerdbuddy2@gmail.com" className="text-primary font-semibold hover:underline">
              gerdbuddy2@gmail.com
            </a>
            .
          </p>
          <Link to="/" className="text-primary font-semibold hover:underline">
            Return to Support
          </Link>
        </section>

        <footer className="pt-2 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">© 2025 Luke McKnight</p>
          <p>GERDBuddy is not a substitute for professional medical advice.</p>
        </footer>
      </div>
    </div>
  );
};

export default Terms;
