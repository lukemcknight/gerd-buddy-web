import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { HelmetProvider } from "react-helmet-async";
import StartPage from "../StartPage";

const ACCOUNT_STEP_INDEX = 23;

const mockSignUp = vi.fn();
const mockSignIn = vi.fn();

vi.mock("../../../contexts/AuthContext", () => ({
  // `loading: true`: this file only asserts that a successful signup
  // advances *past* AccountStep into the paywall step (title text visible).
  // It never exercises PaywallStep's own RC behavior, so auth is left
  // "still resolving" here on purpose -- that keeps PaywallStep's
  // `if (!user) return` init guard in effect (no real, unmocked rc.ts calls)
  // and keeps its signed-out redirect (which only fires once loading
  // resolves to false) from firing and bouncing back to AccountStep before
  // the assertion runs. See paywall.test.tsx for real PaywallStep coverage.
  useAuth: () => ({ signUp: mockSignUp, signIn: mockSignIn, user: null, loading: true }),
}));

function seedAtAccountStep(answers: Record<string, unknown> = { name: "Sam" }) {
  localStorage.setItem(
    "gb_funnel_v1",
    JSON.stringify({ v: 1, stepIndex: ACCOUNT_STEP_INDEX, answers })
  );
}

beforeEach(() => {
  localStorage.clear();
  mockSignUp.mockReset();
  mockSignIn.mockReset();
  (window as unknown as { posthog?: { capture: ReturnType<typeof vi.fn> } }).posthog = {
    capture: vi.fn(),
  };
  (window as unknown as { fbq?: ReturnType<typeof vi.fn> }).fbq = vi.fn();
});

afterEach(() => {
  localStorage.clear();
  delete (window as unknown as { posthog?: unknown }).posthog;
  delete (window as unknown as { fbq?: unknown }).fbq;
});

const renderWithHelmet = (component: React.ReactElement) => {
  return render(<HelmetProvider>{component}</HelmetProvider>);
};

describe("AccountStep", () => {
  it("happy signup: advances, records the email answer, and fires analytics", async () => {
    mockSignUp.mockResolvedValueOnce(undefined);
    seedAtAccountStep();
    const user = userEvent.setup();
    renderWithHelmet(<StartPage />);

    expect(await screen.findByText("Save your plan")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), "sam@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse-1");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(mockSignUp).toHaveBeenCalledWith(
      "sam@example.com",
      "correct-horse-1",
      "Sam"
    );

    // advanced past the account step to the paywall step
    expect(
      await screen.findByText("Try GERDBuddy Pro for $0.00")
    ).toBeInTheDocument();

    const saved = JSON.parse(localStorage.getItem("gb_funnel_v1") || "{}");
    expect(saved.answers.email).toBe("sam@example.com");

    const win = window as unknown as {
      posthog: { capture: ReturnType<typeof vi.fn> };
      fbq: ReturnType<typeof vi.fn>;
    };
    expect(win.posthog.capture).toHaveBeenCalledWith(
      "web_account_created",
      expect.objectContaining({ platform: "web" })
    );
    expect(win.fbq).toHaveBeenCalledWith("track", "Lead", {});
  });

  it("disables the submit button while the request is pending", async () => {
    let resolveSignUp: () => void = () => {};
    mockSignUp.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveSignUp = resolve;
        })
    );
    seedAtAccountStep();
    const user = userEvent.setup();
    renderWithHelmet(<StartPage />);

    await user.type(screen.getByLabelText("Email"), "sam@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse-1");

    const submit = screen.getByRole("button", { name: "Continue" });
    await user.click(submit);

    expect(submit).toBeDisabled();

    resolveSignUp();
    await waitFor(() =>
      expect(
        screen.getByText("Try GERDBuddy Pro for $0.00")
      ).toBeInTheDocument()
    );
  });

  it("email-already-in-use flips to sign-in mode with the exact message, then sign-in success advances", async () => {
    const err = Object.assign(new Error("Firebase: email in use."), {
      code: "auth/email-already-in-use",
    });
    mockSignUp.mockRejectedValueOnce(err);
    mockSignIn.mockResolvedValueOnce(undefined);

    seedAtAccountStep();
    const user = userEvent.setup();
    renderWithHelmet(<StartPage />);

    await user.type(screen.getByLabelText("Email"), "sam@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-attempt");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByText(
        "Welcome back. Enter your password to keep going."
      )
    ).toBeInTheDocument();
    expect(mockSignIn).not.toHaveBeenCalled();

    // form flips to sign-in mode; submit now signs in instead of signing up
    await user.type(screen.getByLabelText("Password"), "actual-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(mockSignIn).toHaveBeenCalledWith("sam@example.com", "actual-password");
    expect(
      await screen.findByText("Try GERDBuddy Pro for $0.00")
    ).toBeInTheDocument();
  });

  it("renders an inline error and does not advance on failure", async () => {
    const err = Object.assign(new Error("Firebase: wrong password."), {
      code: "auth/wrong-password",
    });
    mockSignUp.mockRejectedValueOnce(err);

    seedAtAccountStep();
    const user = userEvent.setup();
    renderWithHelmet(<StartPage />);

    await user.type(screen.getByLabelText("Email"), "sam@example.com");
    await user.type(screen.getByLabelText("Password"), "bad-password");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByText("Firebase: wrong password.")
    ).toBeInTheDocument();
    expect(screen.getByText("Save your plan")).toBeInTheDocument();
    expect(
      screen.queryByText("Try GERDBuddy Pro for $0.00")
    ).not.toBeInTheDocument();
  });

  it("does not persist the UI 'friend' fallback as a display name when no name was collected", async () => {
    mockSignUp.mockResolvedValueOnce(undefined);
    seedAtAccountStep({}); // no `name` answer -> displayName UI fallback is "friend"
    const user = userEvent.setup();
    renderWithHelmet(<StartPage />);

    await user.type(screen.getByLabelText("Email"), "nameless@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse-1");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByText("Try GERDBuddy Pro for $0.00")
    ).toBeInTheDocument();

    expect(mockSignUp).toHaveBeenCalledWith(
      "nameless@example.com",
      "correct-horse-1",
      undefined
    );
  });

  it("guards against a double submit: a second submit while pending calls signUp only once", async () => {
    let resolveSignUp: () => void = () => {};
    mockSignUp.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveSignUp = resolve;
        })
    );
    seedAtAccountStep();
    const user = userEvent.setup();
    renderWithHelmet(<StartPage />);

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    await user.type(emailInput, "sam@example.com");
    await user.type(passwordInput, "correct-horse-1");

    const form = passwordInput.closest("form");
    expect(form).not.toBeNull();

    // First submit via the Enter key inside the password field (native
    // implicit form submission), not a button click.
    await user.type(passwordInput, "{Enter}");
    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));

    // Second submit attempt while the first is still pending, dispatched
    // directly on the form so it exercises AccountStep's own
    // `if (pending) return` guard rather than relying on the submit
    // button's `disabled` attribute to block it.
    fireEvent.submit(form as HTMLFormElement);
    await Promise.resolve();

    expect(mockSignUp).toHaveBeenCalledTimes(1);

    resolveSignUp();
    await waitFor(() =>
      expect(
        screen.getByText("Try GERDBuddy Pro for $0.00")
      ).toBeInTheDocument()
    );
    expect(mockSignUp).toHaveBeenCalledTimes(1);
  });
});
