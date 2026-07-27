import SEO from "@/components/SEO";

const Privacy = () => {
  return (
    <div className="bg-background text-foreground">
      <SEO
        title="Privacy Policy"
        description="Learn what GERDBuddy stores on your device and what is processed when you use analytics, account, subscription, or AI features."
        path="/privacy"
      />
      <div className="mx-auto w-full max-w-screen-xl px-4 py-12">
        <div className="max-w-prose mx-auto space-y-8">
        <header className="space-y-2 opacity-0 animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">GERDBuddy</p>
          <h1 className="text-3xl font-display font-bold">Privacy Policy</h1>
          <p className="text-muted-foreground">
            This policy explains what GERDBuddy stores locally, what leaves your device when you use connected features,
            and the choices available to you. Effective July 20, 2026.
          </p>
        </header>

        <section className="card-elevated p-6 space-y-4 opacity-0 animate-slide-up stagger-1">
          <h2 className="text-xl font-display font-semibold">Data stored on your device</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>Meal, symptom, medication, check-in, profile, and plan entries are stored in the app's local storage.</li>
            <li>These entries are not synced to a GERDBuddy health-record account.</li>
            <li>The app may request access to your camera or photo library when you choose a scanner feature, and notification permission when you enable reminders.</li>
          </ul>
        </section>

        <section className="card-elevated p-6 space-y-4 opacity-0 animate-slide-up stagger-2">
          <h2 className="text-xl font-display font-semibold">Connected features and service providers</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>
              <strong className="text-foreground">AI features:</strong> when you choose food scanning, menu scanning,
              visit preparation, or AI chat, the selected image, your prompt, and relevant context may be sent to
              Google's Gemini API to produce the response.
            </li>
            <li>
              <strong className="text-foreground">Product analytics:</strong> PostHog receives app lifecycle and feature
              events, a pseudonymous app identifier, and limited event properties such as feature choices, symptom
              categories, severity, or scan outcome. Touch autocapture, automatic screen capture, and session replay are disabled.
            </li>
            <li>
              <strong className="text-foreground">Website analytics:</strong> this website sends PostHog a pageview
              event containing the page address, the referring site, and coarse browser and country information, so we
              can see which articles are useful and where readers arrive from. Autocapture and session replay are
              disabled, so form fields and on-page interactions are never recorded, and we do not build a profile of
              you unless you sign in. If your browser sends a Do Not Track signal, no analytics are collected at all.
            </li>
            <li>
              <strong className="text-foreground">Accounts:</strong> if you create an account, Firebase Authentication
              processes your email address and sign-in credentials.
            </li>
            <li>
              <strong className="text-foreground">Subscriptions:</strong> Apple and RevenueCat process purchase,
              entitlement, and subscription identifiers. If advertising attribution is enabled and you grant Apple's
              tracking permission, Meta and RevenueCat may also process device or attribution identifiers.
            </li>
          </ul>
          <p className="text-muted-foreground">
            We use these providers to operate and improve the app. We do not sell meal, symptom, photo, or chat content,
            and we do not use that content for third-party advertising.
          </p>
        </section>

        <section className="card-elevated p-6 space-y-4 opacity-0 animate-slide-up stagger-3">
          <h2 className="text-xl font-display font-semibold">Your choices</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>You can avoid connected AI features and continue using the local meal and symptom log.</li>
            <li>You can disable notifications in the app or in your device settings.</li>
            <li>Clear All Data or Start Over removes GERDBuddy's app-owned local data. Deleting the app also removes its local storage.</li>
            <li>Local deletion does not cancel an Apple subscription or automatically delete records already processed by a service provider.</li>
            <li>You can email us to request help with access or deletion questions for account or service data.</li>
          </ul>
        </section>

        <section className="card-elevated p-6 space-y-3 opacity-0 animate-slide-up stagger-4">
          <h2 className="text-xl font-display font-semibold">Contact</h2>
          <p className="text-muted-foreground">
            Questions about privacy? Reach out anytime at{" "}
            <a href="mailto:gerdbuddy2@gmail.com" className="text-primary font-semibold hover:underline">
              gerdbuddy2@gmail.com
            </a>
            .
          </p>
        </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
