const ORIGINAL_ENV = { ...process.env };

const loadModule = () => {
  jest.resetModules();
  return require("../doctorAI");
};

const mockGeminiText = (text) =>
  Promise.resolve({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }],
    }),
  });

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  process.env.EXPO_PUBLIC_FOOD_AI_KEY = "test-key";
  global.fetch = jest.fn();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  jest.clearAllMocks();
});

describe("formatUserContextForPrompt", () => {
  it("renders an empty string for an empty context", () => {
    const { formatUserContextForPrompt } = loadModule();
    expect(formatUserContextForPrompt({})).toBe("");
  });

  it("includes top triggers with their stats", () => {
    const { formatUserContextForPrompt } = loadModule();
    const out = formatUserContextForPrompt({
      topTriggers: [
        { ingredient: "tomato sauce", symptomRate: 75, avgSeverity: 3.4, totalOccurrences: 8 },
      ],
    });
    expect(out).toContain("tomato sauce");
    expect(out).toContain("75% symptom rate");
    expect(out).toContain("avg severity 3.4/5");
  });

  it("includes recent symptoms when present", () => {
    const { formatUserContextForPrompt } = loadModule();
    const out = formatUserContextForPrompt({
      recentSymptoms: [{ type: "heartburn", severity: 4, ago: "2h ago" }],
    });
    expect(out).toContain("heartburn");
    expect(out).toContain("2h ago");
  });
});

describe("generateVisitPrepQuestions", () => {
  it("parses a valid JSON response", async () => {
    global.fetch.mockImplementation(() =>
      mockGeminiText(
        JSON.stringify({
          questions: [
            "Should I test for H. pylori given my evening flares?",
            "Is my current severity trend a reason to consider PPIs?",
            "Should I try an elimination diet?",
          ],
          concerningTrends: ["Severity rose from 2.1 to 3.4 over 14 days"],
        })
      )
    );
    const { generateVisitPrepQuestions } = loadModule();
    const result = await generateVisitPrepQuestions({ topTriggers: [], safeFoods: [] });
    expect(result.questions).toHaveLength(3);
    expect(result.concerningTrends).toHaveLength(1);
    expect(result.questions[0]).toContain("H. pylori");
  });

  it("extracts JSON when the model wraps it in a markdown fence", async () => {
    global.fetch.mockImplementation(() =>
      mockGeminiText(
        "```json\n" +
          JSON.stringify({
            questions: ["Q1", "Q2", "Q3"],
            concerningTrends: [],
          }) +
          "\n```"
      )
    );
    const { generateVisitPrepQuestions } = loadModule();
    const result = await generateVisitPrepQuestions({ topTriggers: [], safeFoods: [] });
    expect(result.questions).toEqual(["Q1", "Q2", "Q3"]);
  });

  it("returns the fallback when the response is unparseable", async () => {
    global.fetch.mockImplementation(() => mockGeminiText("not json at all"));
    const { generateVisitPrepQuestions } = loadModule();
    const result = await generateVisitPrepQuestions({ topTriggers: [], safeFoods: [] });
    expect(result.questions.length).toBe(3);
    expect(result.questions[0]).toMatch(/.+/);
  });

  it("throws when the API key is missing", async () => {
    process.env.EXPO_PUBLIC_FOOD_AI_KEY = "YOUR_GEMINI_API_KEY_HERE";
    const { generateVisitPrepQuestions } = loadModule();
    await expect(
      generateVisitPrepQuestions({ topTriggers: [], safeFoods: [] })
    ).rejects.toThrow(/Missing AI API key/);
  });
});

describe("askDoctorAI", () => {
  it("returns reply text and parses cited sources", async () => {
    global.fetch.mockImplementation(() =>
      mockGeminiText(
        "Your evening flares may be tied to late meals.\nCITED: late eating pattern, 3 tomato meals in 7d"
      )
    );
    const { askDoctorAI } = loadModule();
    const result = await askDoctorAI({
      userMessage: "Why am I flaring tonight?",
      userContext: { topTriggers: [], safeFoods: [] },
    });
    expect(result.reply).toBe("Your evening flares may be tied to late meals.");
    expect(result.sourceFacts).toEqual([
      "late eating pattern",
      "3 tomato meals in 7d",
    ]);
  });

  it("returns an empty sourceFacts array when no CITED line is present", async () => {
    global.fetch.mockImplementation(() =>
      mockGeminiText("Try staying upright after meals.")
    );
    const { askDoctorAI } = loadModule();
    const result = await askDoctorAI({
      userMessage: "Tips?",
      userContext: { topTriggers: [], safeFoods: [] },
    });
    expect(result.sourceFacts).toEqual([]);
    expect(result.reply).toBe("Try staying upright after meals.");
  });

  it("throws when the API key is missing", async () => {
    process.env.EXPO_PUBLIC_FOOD_AI_KEY = "YOUR_GEMINI_API_KEY_HERE";
    const { askDoctorAI } = loadModule();
    await expect(
      askDoctorAI({ userMessage: "hi", userContext: { topTriggers: [], safeFoods: [] } })
    ).rejects.toThrow(/Missing AI API key/);
  });

  it("surfaces a useful error when the API returns non-OK", async () => {
    global.fetch.mockImplementation(() =>
      Promise.resolve({ ok: false, status: 500, text: async () => "server is sad" })
    );
    const { askDoctorAI } = loadModule();
    await expect(
      askDoctorAI({ userMessage: "hi", userContext: { topTriggers: [], safeFoods: [] } })
    ).rejects.toThrow(/Chat failed \(500\): server is sad/);
  });
});
