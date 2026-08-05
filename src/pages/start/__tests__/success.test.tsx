import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import StartPage from "../StartPage";

const SUCCESS_STEP_INDEX = 25; // Last step in the funnel

const mockUser = { uid: "uid-123" };
const mockSignUp = vi.fn();
const mockSignIn = vi.fn();

let authState: { user: { uid: string } | null; loading: boolean } = {
  user: mockUser,
  loading: false,
};

vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({ signUp: mockSignUp, signIn: mockSignIn, ...authState }),
}));

const configureRC = vi.fn();
const getAnnualPackage = vi.fn();
const purchaseAnnual = vi.fn();
const hasPro = vi.fn();
const setUtmAttributes = vi.fn();

vi.mock("../funnel/rc", () => ({
  configureRC: (...args: unknown[]) => configureRC(...args),
  getAnnualPackage: (...args: unknown[]) => getAnnualPackage(...args),
  purchaseAnnual: (...args: unknown[]) => purchaseAnnual(...args),
  hasPro: (...args: unknown[]) => hasPro(...args),
  setUtmAttributes: (...args: unknown[]) => setUtmAttributes(...args),
}));

const fakeCustomerInfo = { entitlements: { active: { "GERD Buddy Pro": {} } } };

function seedAtSuccessStep(answers: Record<string, unknown> = { name: "Sam", email: "sam@example.com" }) {
  localStorage.setItem(
    "gb_funnel_v1",
    JSON.stringify({ v: 1, stepIndex: SUCCESS_STEP_INDEX, answers })
  );
}

function analyticsWindow() {
  return window as unknown as {
    posthog: { capture: ReturnType<typeof vi.fn> };
    fbq: ReturnType<typeof vi.fn>;
    gtag: ReturnType<typeof vi.fn>;
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  authState = { user: mockUser, loading: false };
  (window as unknown as { posthog?: { capture: ReturnType<typeof vi.fn> } }).posthog = {
    capture: vi.fn(),
  };
  (window as unknown as { fbq?: ReturnType<typeof vi.fn> }).fbq = vi.fn();
  (window as unknown as { gtag?: ReturnType<typeof vi.fn> }).gtag = vi.fn();

  configureRC.mockReturnValue({
    getCustomerInfo: vi.fn().mockResolvedValue(fakeCustomerInfo),
  });
  hasPro.mockImplementation((info: unknown) => info === fakeCustomerInfo);
});

afterEach(() => {
  localStorage.clear();
  delete (window as unknown as { posthog?: unknown }).posthog;
  delete (window as unknown as { fbq?: unknown }).fbq;
  delete (window as unknown as { gtag?: unknown }).gtag;
});

describe("SuccessStep", () => {
  it("renders the title greeting by name", async () => {
    seedAtSuccessStep({ name: "Sam", email: "sam@example.com" });
    render(<StartPage />);

    expect(await screen.findByText("You are in, Sam.")).toBeInTheDocument();
  });

  it("renders the email bold in the sign-in line", async () => {
    seedAtSuccessStep({ name: "Sam", email: "sam@example.com" });
    render(<StartPage />);

    await screen.findByText("You are in, Sam.");
    const emailBold = screen.getByText("sam@example.com");
    expect(emailBold.tagName).toBe("STRONG");
    expect(screen.getByText("Sign in with")).toBeInTheDocument();
  });

  it("renders fallback text when email is missing", async () => {
    seedAtSuccessStep({ name: "Sam" }); // no email
    render(<StartPage />);

    await screen.findByText("You are in, Sam.");
    expect(screen.getByText("Sign in with")).toBeInTheDocument();
    expect(screen.getByText("the email you just used")).toBeInTheDocument();
  });

  it("renders the reassurance line", async () => {
    seedAtSuccessStep({ name: "Sam", email: "sam@example.com" });
    render(<StartPage />);

    expect(
      await screen.findByText(
        "Your subscription is active. The app unlocks the moment you sign in."
      )
    ).toBeInTheDocument();
  });

  it("renders an App Store link with the correct URL", async () => {
    seedAtSuccessStep({ name: "Sam", email: "sam@example.com" });
    render(<StartPage />);

    await screen.findByText("You are in, Sam.");
    const appStoreLink = screen.getByRole("link", {
      name: /app store|download/i,
    }) as HTMLAnchorElement;

    expect(appStoreLink).toBeInTheDocument();
    expect(appStoreLink.href).toBe(
      "https://apps.apple.com/us/app/gerdbuddy-acid-reflux-relief/id6756620910"
    );
    expect(appStoreLink.target).toBe("_blank");
    expect(appStoreLink.rel).toContain("noopener");
  });

  it("fires web_funnel_completed event exactly once on mount", async () => {
    seedAtSuccessStep({ name: "Sam", email: "sam@example.com" });
    render(<StartPage />);

    await screen.findByText("You are in, Sam.");

    const win = analyticsWindow();
    expect(win.posthog.capture).toHaveBeenCalledWith(
      "web_funnel_completed",
      expect.objectContaining({ platform: "web" })
    );

    // Verify it was called exactly once for the completion event
    const completionCalls = vi
      .mocked(win.posthog.capture)
      .mock.calls.filter(
        (call) => call[0] === "web_funnel_completed"
      );
    expect(completionCalls).toHaveLength(1);
  });

  it("does not duplicate web_funnel_completed on rerender", async () => {
    seedAtSuccessStep({ name: "Sam", email: "sam@example.com" });
    const { rerender } = render(<StartPage />);

    await screen.findByText("You are in, Sam.");

    const win = analyticsWindow();
    const completionCallsBeforeRerender = vi
      .mocked(win.posthog.capture)
      .mock.calls.filter(
        (call) => call[0] === "web_funnel_completed"
      );
    expect(completionCallsBeforeRerender).toHaveLength(1);

    rerender(<StartPage />);

    const completionCallsAfterRerender = vi
      .mocked(win.posthog.capture)
      .mock.calls.filter(
        (call) => call[0] === "web_funnel_completed"
      );
    expect(completionCallsAfterRerender).toHaveLength(1);
  });
});
