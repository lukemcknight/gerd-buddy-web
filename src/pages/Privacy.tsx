const Privacy = () => {
  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-4 py-12 space-y-8">
        <header className="space-y-2 opacity-0 animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">GERDBuddy</p>
          <h1 className="text-3xl font-display font-bold">Privacy Policy</h1>
          <p className="text-muted-foreground">
            GERDBuddy is built to keep your information private. This page outlines what data the app uses and how it is
            handled.
          </p>
        </header>

        <section className="card-elevated p-6 space-y-4 opacity-0 animate-slide-up stagger-1">
          <h2 className="text-xl font-display font-semibold">What we collect</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>Information you add inside the app (like symptoms or notes) stays on your device.</li>
            <li>No analytics, tracking pixels, or third-party advertising SDKs are used.</li>
            <li>No location data, contacts, or personal identifiers are requested.</li>
          </ul>
        </section>

        <section className="card-elevated p-6 space-y-4 opacity-0 animate-slide-up stagger-2">
          <h2 className="text-xl font-display font-semibold">How data is used</h2>
          <p className="text-muted-foreground">
            Data you add is used only to power in-app features you choose to use, such as viewing your own entries or
            identifying patterns. Data is not sold or shared with third parties.
          </p>
        </section>

        <section className="card-elevated p-6 space-y-4 opacity-0 animate-slide-up stagger-3">
          <h2 className="text-xl font-display font-semibold">Your choices</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>You can delete the app to remove local data stored on your device.</li>
            <li>If you email us for help, we only use your email to respond to your request.</li>
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
  );
};

export default Privacy;
