import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import StartPage from "../StartPage";

const ACCOUNT_STEP_INDEX = 23;

const mockSignUp = vi.fn();
const mockSignIn = vi.fn();

vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({ signUp: mockSignUp, signIn: mockSignIn, user: null }),
}));

function seedAtAccountStep() {
  localStorage.setItem(
    "gb_funnel_v1",
    JSON.stringify({ v: 1, stepIndex: ACCOUNT_STEP_INDEX, answers: { name: "Sam" } })
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

describe("AccountStep", () => {
  it("happy signup: advances, records the email answer, and fires analytics", async () => {
    mockSignUp.mockResolvedValueOnce(undefined);
    seedAtAccountStep();
    const user = userEvent.setup();
    render(<StartPage />);

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
    render(<StartPage />);

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
    render(<StartPage />);

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
    render(<StartPage />);

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
});
