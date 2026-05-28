/**
 * Tests for DoctorChatScreen — source-string-based, matching the project's
 * existing screen-test pattern (see ScanResultsScreen.test.js).
 *
 * Verifies: AI client + storage quota helpers are wired in, analytics events
 * fire, disclaimer copy is present, suggested questions render, and the
 * quota gate exists.
 */

describe("DoctorChatScreen", () => {
  let source;

  beforeAll(() => {
    const fs = require("fs");
    const path = require("path");
    source = fs.readFileSync(
      path.join(__dirname, "..", "DoctorChatScreen.js"),
      "utf-8"
    );
  });

  it("imports the askDoctorAI client", () => {
    expect(source).toContain("askDoctorAI");
    expect(source).toMatch(/from ["']\.\.\/services\/doctorAI["']/);
  });

  it("imports the AI chat quota helpers from storage", () => {
    expect(source).toContain("AI_CHAT_DAILY_LIMIT");
    expect(source).toContain("getAIChatCount");
    expect(source).toContain("incrementAIChatCount");
    expect(source).toContain("resetAIChatCountIfNewDay");
  });

  it("fires AI_CHAT_OPENED on mount", () => {
    expect(source).toMatch(/EVENTS\.AI_CHAT_OPENED/);
  });

  it("fires AI_CHAT_MESSAGE_SENT after a successful reply", () => {
    expect(source).toMatch(/EVENTS\.AI_CHAT_MESSAGE_SENT/);
  });

  it("fires AI_CHAT_QUOTA_REACHED when the daily limit is hit", () => {
    expect(source).toMatch(/EVENTS\.AI_CHAT_QUOTA_REACHED/);
  });

  it("renders the medical disclaimer copy", () => {
    expect(source).toContain("not medical advice");
  });

  it("includes the suggested-question chips on empty state", () => {
    expect(source).toContain("SUGGESTED_QUESTIONS");
    expect(source).toContain("Why am I having heartburn today?");
  });

  it("builds user context from the trigger engine + storage", () => {
    expect(source).toContain("generateTriggerReport");
    expect(source).toContain("getMeals");
    expect(source).toContain("getSymptoms");
    expect(source).toContain("getUser");
  });

  it("renders ChatBubble for each message", () => {
    expect(source).toContain("ChatBubble");
  });

  it("guards against sending when quota is exhausted", () => {
    expect(source).toMatch(/remaining\s*<=?\s*0/);
  });
});
