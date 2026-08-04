import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import StartPage from "../StartPage";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("StartPage", () => {
  it("shows the landing title", () => {
    render(<StartPage />);
    expect(screen.getByText("Eat without fear again.")).toBeInTheDocument();
  });

  it("clicking the landing CTA shows the age step", async () => {
    const user = userEvent.setup();
    render(<StartPage />);

    await user.click(screen.getByRole("button", { name: "Start my quiz" }));

    expect(screen.getByText("How old are you?")).toBeInTheDocument();
  });

  it("selecting an age option advances to sex", async () => {
    const user = userEvent.setup();
    render(<StartPage />);

    await user.click(screen.getByRole("button", { name: "Start my quiz" }));
    await user.click(screen.getByRole("button", { name: "30-44" }));

    expect(screen.getByText("What is your sex?")).toBeInTheDocument();
  });

  it("slider step advances via CTA", async () => {
    localStorage.setItem(
      "gb_funnel_v1",
      JSON.stringify({ v: 1, stepIndex: 8, answers: {} })
    );
    const user = userEvent.setup();
    render(<StartPage />);

    expect(
      await screen.findByText(
        "How many nights a week does reflux wake you or keep you up?"
      )
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(
      await screen.findByText("What do you spend per month managing it?")
    ).toBeInTheDocument();
  });
});
