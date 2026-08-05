import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import StartPage from "../StartPage";

const PAYWALL_STEP_INDEX = 24;

const mockUser = { uid: "uid-123" };
const mockSignUp = vi.fn();
const mockSignIn = vi.fn();

// Mutable so individual tests can flip auth state (e.g. signed-out, still
// loading) without redeclaring the whole mock. Read lazily inside the
// useAuth() closure, so this is safe despite vi.mock's hoisting.
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

const fakePkg = { identifier: "$rc_annual" };
const inactiveCustomerInfo = { entitlements: { active: {} } };
const activeCustomerInfo = { entitlements: { active: { "GERD Buddy Pro": {} } } };

const PKG_ERROR_MESSAGE = "We could not load the plan. Check your connection and retry.";
const CHARGE_MESSAGE = "No charge was made. Try again when ready.";

function seedAtPaywallStep(answers: Record<string, unknown> = { name: "Sam" }) {
  localStorage.setItem(
    "gb_funnel_v1",
    JSON.stringify({ v: 1, stepIndex: PAYWALL_STEP_INDEX, answers })
  );
}

function fakePurchases(overrides: Record<string, unknown> = {}) {
  return {
    getCustomerInfo: vi.fn().mockResolvedValue(inactiveCustomerInfo),
    ...overrides,
  };
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

  getAnnualPackage.mockResolvedValue(fakePkg);
  setUtmAttributes.mockResolvedValue(true);
  hasPro.mockImplementation((info: unknown) => info === activeCustomerInfo);
});

afterEach(() => {
  localStorage.clear();
  delete (window as unknown as { posthog?: unknown }).posthog;
  delete (window as unknown as { fbq?: unknown }).fbq;
  delete (window as unknown as { gtag?: unknown }).gtag;
});

describe("PaywallStep", () => {
  it("skips straight to the next step when the user already has the entitlement (idempotent re-entry)", async () => {
    configureRC.mockReturnValue(
      fakePurchases({ getCustomerInfo: vi.fn().mockResolvedValue(activeCustomerInfo) })
    );
    seedAtPaywallStep();
    render(<StartPage />);

    expect(await screen.findByText("You are in, Sam.")).toBeInTheDocument();
    expect(configureRC).toHaveBeenCalledWith("uid-123");
    expect(getAnnualPackage).not.toHaveBeenCalled();
  });

  it("renders the CTA, checkmark line, and verbatim subtitle once the package loads", async () => {
    configureRC.mockReturnValue(fakePurchases());
    seedAtPaywallStep();
    render(<StartPage />);

    expect(await screen.findByText("Try GERDBuddy Pro for $0.00")).toBeInTheDocument();
    expect(screen.getByText("✓ No Payment Due Now")).toBeInTheDocument();
    expect(
      screen.getByText("3-day free trial, then $39.99/year ($0.76/week). Cancel anytime.")
    ).toBeInTheDocument();

    const cta = await screen.findByRole("button", { name: "try for $0.00" });
    expect(cta).not.toBeDisabled();
  });

  it("purchase success fires trial_started (with utm), StartTrial pixel, and the gtag conversion event, then advances", async () => {
    configureRC.mockReturnValue(fakePurchases());
    purchaseAnnual.mockResolvedValue(activeCustomerInfo);
    seedAtPaywallStep({ name: "Sam", utm: { utm_source: "meta", utm_medium: "cpc" } });

    const user = userEvent.setup();
    render(<StartPage />);

    const cta = await screen.findByRole("button", { name: "try for $0.00" });
    await user.click(cta);

    await waitFor(() => expect(purchaseAnnual).toHaveBeenCalled());

    const win = analyticsWindow();
    expect(win.posthog.capture).toHaveBeenCalledWith(
      "trial_started",
      expect.objectContaining({
        source: "web_funnel",
        utm_source: "meta",
        utm_medium: "cpc",
        platform: "web",
      })
    );
    expect(win.fbq).toHaveBeenCalledWith("track", "StartTrial", {});
    expect(win.gtag).toHaveBeenCalledWith("event", "conversion_trial_start", undefined);

    expect(await screen.findByText("You are in, Sam.")).toBeInTheDocument();
  });

  it("purchase error (card decline) shows the exact message with error styling, re-enables the CTA, and does not fire trial analytics", async () => {
    configureRC.mockReturnValue(fakePurchases());
    purchaseAnnual.mockRejectedValue(new Error("Your card was declined."));
    seedAtPaywallStep();

    const user = userEvent.setup();
    render(<StartPage />);

    const cta = await screen.findByRole("button", { name: "try for $0.00" });
    await user.click(cta);

    const message = await screen.findByText(CHARGE_MESSAGE);
    expect(message).toHaveAttribute("role", "alert");

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "try for $0.00" })).not.toBeDisabled()
    );
    expect(screen.getByText("Try GERDBuddy Pro for $0.00")).toBeInTheDocument();

    const win = analyticsWindow();
    expect(win.posthog.capture).not.toHaveBeenCalledWith("trial_started", expect.anything());
    expect(win.fbq).not.toHaveBeenCalledWith("track", "StartTrial", expect.anything());
    expect(win.gtag).not.toHaveBeenCalledWith("event", "conversion_trial_start", expect.anything());
  });

  it("user-cancelled purchase shows the exact message without error styling, re-enables the CTA, and does not fire trial analytics", async () => {
    configureRC.mockReturnValue(fakePurchases());
    purchaseAnnual.mockRejectedValue(Object.assign(new Error("cancelled"), { errorCode: 1 }));
    seedAtPaywallStep();

    const user = userEvent.setup();
    render(<StartPage />);

    const cta = await screen.findByRole("button", { name: "try for $0.00" });
    await user.click(cta);

    const message = await screen.findByText(CHARGE_MESSAGE);
    expect(message).not.toHaveAttribute("role", "alert");

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "try for $0.00" })).not.toBeDisabled()
    );

    const win = analyticsWindow();
    expect(win.posthog.capture).not.toHaveBeenCalledWith("trial_started", expect.anything());
    expect(win.fbq).not.toHaveBeenCalledWith("track", "StartTrial", expect.anything());
    expect(win.gtag).not.toHaveBeenCalledWith("event", "conversion_trial_start", expect.anything());
  });

  it("catch-path entitlement re-check: purchase rejects but the user is actually entitled -> success branch runs, no error copy shown", async () => {
    // Simulates the SDK's documented failure mode: Stripe charges the card,
    // but the purchase() promise still rejects (e.g. a post-charge
    // getCustomerInfo call inside the SDK failed, or the user hit browser
    // back mid-checkout after the charge went through).
    const purchases = fakePurchases();
    configureRC.mockReturnValue(purchases);
    purchaseAnnual.mockRejectedValue(new Error("network blip after charge"));
    seedAtPaywallStep();

    const user = userEvent.setup();
    render(<StartPage />);

    const cta = await screen.findByRole("button", { name: "try for $0.00" });
    // Mount-time entitlement check already consumed the default (inactive)
    // resolved value; the *next* getCustomerInfo call is the catch-block
    // re-check triggered by the rejected purchase, so queue the active
    // result for exactly that call.
    purchases.getCustomerInfo.mockResolvedValueOnce(activeCustomerInfo);

    await user.click(cta);

    expect(await screen.findByText("You are in, Sam.")).toBeInTheDocument();
    expect(screen.queryByText(CHARGE_MESSAGE)).not.toBeInTheDocument();

    const win = analyticsWindow();
    expect(win.posthog.capture).toHaveBeenCalledWith(
      "trial_started",
      expect.objectContaining({ source: "web_funnel" })
    );
    expect(win.fbq).toHaveBeenCalledWith("track", "StartTrial", {});
    expect(win.gtag).toHaveBeenCalledWith("event", "conversion_trial_start", undefined);
  });

  it("double-click on the CTA fires purchaseAnnual exactly once", async () => {
    configureRC.mockReturnValue(fakePurchases());
    let resolvePurchase: (info: unknown) => void = () => {};
    purchaseAnnual.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePurchase = resolve;
        })
    );
    seedAtPaywallStep();

    render(<StartPage />);

    const cta = await screen.findByRole("button", { name: "try for $0.00" });
    // Two synchronous clicks with no await between them, so the second
    // fires before React can re-render the (by-then) disabled button --
    // this exercises PaywallStep's own ref-based purchasing guard, not the
    // button's `disabled` attribute.
    fireEvent.click(cta);
    fireEvent.click(cta);

    await waitFor(() => expect(purchaseAnnual).toHaveBeenCalledTimes(1));

    resolvePurchase(activeCustomerInfo);
    await screen.findByText("You are in, Sam.");
    expect(purchaseAnnual).toHaveBeenCalledTimes(1);
  });

  it("configureRC throwing renders an error state with retry, and fires web_paywall_init_failed", async () => {
    configureRC
      .mockImplementationOnce(() => {
        throw new Error("Missing VITE_RC_WEB_API_KEY");
      })
      .mockReturnValue(fakePurchases());
    seedAtPaywallStep();

    render(<StartPage />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "We could not start checkout. Please check your connection and try again."
    );
    expect(screen.queryByRole("button", { name: "try for $0.00" })).not.toBeInTheDocument();
    expect(getAnnualPackage).not.toHaveBeenCalled();

    const win = analyticsWindow();
    expect(win.posthog.capture).toHaveBeenCalledWith(
      "web_paywall_init_failed",
      expect.objectContaining({ message: "Missing VITE_RC_WEB_API_KEY" })
    );

    const retry = screen.getByRole("button", { name: "Retry" });
    await userEvent.setup().click(retry);

    expect(await screen.findByRole("button", { name: "try for $0.00" })).toBeInTheDocument();
  });

  it("getCustomerInfo rejecting twice fails closed: no purchase CTA, retry affordance shown instead", async () => {
    const getCustomerInfo = vi.fn().mockRejectedValue(new Error("network"));
    configureRC.mockReturnValue(fakePurchases({ getCustomerInfo }));
    seedAtPaywallStep();

    render(<StartPage />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "We could not confirm your subscription status. Please try again."
    );
    expect(getCustomerInfo).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("button", { name: "try for $0.00" })).not.toBeInTheDocument();
    expect(getAnnualPackage).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("getAnnualPackage rejecting shows the exact retry copy, no purchase CTA", async () => {
    configureRC.mockReturnValue(fakePurchases());
    getAnnualPackage.mockRejectedValue(new Error("network"));
    seedAtPaywallStep();

    render(<StartPage />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(PKG_ERROR_MESSAGE);
    expect(screen.queryByRole("button", { name: "try for $0.00" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("a signed-out user (auth resolved, no user) is routed back to the account step instead of loading forever", async () => {
    authState = { user: null, loading: false };
    seedAtPaywallStep();

    render(<StartPage />);

    expect(await screen.findByText("Save your plan")).toBeInTheDocument();
    expect(configureRC).not.toHaveBeenCalled();
  });

  it("disables the CTA with loading copy while the package fetch is pending", async () => {
    let resolvePkg: (pkg: unknown) => void = () => {};
    getAnnualPackage.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePkg = resolve;
        })
    );
    configureRC.mockReturnValue(fakePurchases());
    seedAtPaywallStep();

    render(<StartPage />);

    expect(await screen.findByText("Try GERDBuddy Pro for $0.00")).toBeInTheDocument();
    const cta = screen.getByText("Loading...");
    expect(cta).toBeDisabled();

    resolvePkg(fakePkg);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "try for $0.00" })).not.toBeDisabled()
    );
  });
});
