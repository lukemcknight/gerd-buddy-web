import { FormEvent, useState } from "react";
import { useFunnel, renderTitle } from "../funnel/FunnelContext";
import { useAuth } from "../../../contexts/AuthContext";
import { trackEvent, pixel } from "../funnel/analytics";

const SIGN_IN_MESSAGE = "Welcome back. Enter your password to keep going.";

type Mode = "signup" | "signin";

export default function AccountStep() {
  const { step, answer, next, displayName, answers, stats } = useFunnel();
  const { signUp, signIn } = useAuth();

  // The "friend" fallback in `displayName` is a UI-only default for page
  // copy (title/subtitle). It must never be written to the account record,
  // so this resolves to the user's real trimmed name, or undefined.
  const realName =
    typeof answers.name === "string" && answers.name.trim()
      ? answers.name.trim()
      : undefined;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("signup");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const title = renderTitle(step.title, { name: displayName, ...stats });
  const subtitle = step.subtitle
    ? renderTitle(step.subtitle, { name: displayName, ...stats })
    : undefined;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;

    setError("");
    setPending(true);

    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password, realName);
      }

      answer("email", email);
      trackEvent("web_account_created");
      pixel("Lead");
      next();
    } catch (err: unknown) {
      const code = (err as { code?: string } | undefined)?.code;
      const message = (err as { message?: string } | undefined)?.message;

      if (code === "auth/email-already-in-use") {
        setMode("signin");
        setPassword("");
        setError(SIGN_IN_MESSAGE);
      } else {
        setError(message || "Something went wrong. Please try again.");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-center gap-8 py-10">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold leading-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 text-base text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <p role="alert" className="text-center text-sm text-destructive">
            {error}
          </p>
        )}

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email"
          autoComplete="email"
          className="w-full rounded-full border-2 border-border bg-white px-6 py-4 text-center text-lg text-foreground outline-none focus:border-primary"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          aria-label="Password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          className="w-full rounded-full border-2 border-border bg-white px-6 py-4 text-center text-lg text-foreground outline-none focus:border-primary"
        />

        <button
          type="submit"
          disabled={pending}
          className="sticky bottom-6 mt-auto w-full rounded-full bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-md transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Please wait..." : mode === "signin" ? "Sign in" : (step.cta ?? "Continue")}
        </button>
      </form>
    </div>
  );
}
