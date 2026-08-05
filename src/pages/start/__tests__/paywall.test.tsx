import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import StartPage from "../StartPage";

const PAYWALL_STEP_INDEX = 24;

const mockUser = { uid: "uid-123" };

vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({ signUp: vi.fn(), signIn: vi.fn(), user: mockUser }),
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

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  (window as unknown as { posthog?: { capture: ReturnType<typeof vi.fn> } }).posthog = {
    capture: vi.fn(),
  };
  (window as unknown as { fbq?: ReturnType<typeof vi.fn> }).fbq = vi.fn();
  (window as unknown as { gtag?: ReturnType<typeof vi.fn> }).gtag = vi.fn();

  getAnnualPackage.mockResolvedValue(fakePkg);
  setUtmAttributes.mockResolvedValue(true);
  hasPro.mockImplementation(
    (info: unknown) => info === activeCustomerInfo
  );
});

afterEach(() => {
  localStorage.clear();
  delete (window as unknown as { posthog?: unknown }).posthog;
  delete (window as unknown as { fbq?: unknown }).fbq;
  delete (window as unknown as { gtag?: unknown }).gtag;
});

describe("PaywallStep", () => {
  it("skips straight to the next step when the user already has the entitlement (idempotent re-entry)", async () => {
    configureRC.mockReturnValue(fakePurchases({ getCustomerInfo: vi.fn().mockResolvedValue(activeCustomerInfo) }));
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

    const win = window as unknown as {
      posthog: { capture: ReturnType<typeof vi.fn> };
      fbq: ReturnType<typeof vi.fn>;
      gtag: ReturnType<typeof vi.fn>;
    };

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

  it("purchase error (card decline) shows the exact message with error styling and re-enables the CTA", async () => {
    configureRC.mockReturnValue(fakePurchases());
    purchaseAnnual.mockRejectedValue(new Error("Your card was declined."));
    seedAtPaywallStep();

    const user = userEvent.setup();
    render(<StartPage />);

    const cta = await screen.findByRole("button", { name: "try for $0.00" });
    await user.click(cta);

    const message = await screen.findByText("No charge was made. Try again when ready.");
    expect(message).toHaveAttribute("role", "alert");

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "try for $0.00" })).not.toBeDisabled()
    );
    expect(screen.getByText("Try GERDBuddy Pro for $0.00")).toBeInTheDocument();
  });

  it("user-cancelled purchase shows the exact message without error styling and re-enables the CTA", async () => {
    configureRC.mockReturnValue(fakePurchases());
    purchaseAnnual.mockRejectedValue(Object.assign(new Error("cancelled"), { errorCode: 1 }));
    seedAtPaywallStep();

    const user = userEvent.setup();
    render(<StartPage />);

    const cta = await screen.findByRole("button", { name: "try for $0.00" });
    await user.click(cta);

    const message = await screen.findByText("No charge was made. Try again when ready.");
    expect(message).not.toHaveAttribute("role", "alert");

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "try for $0.00" })).not.toBeDisabled()
    );
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
