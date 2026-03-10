const ORIGINAL_ENV = { ...process.env };

const loadModule = () => {
  jest.resetModules();
  return require("../foodAnalysis");
};

describe("analyzeFoodImage", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.clearAllMocks();
  });

  it("throws when API key is missing or placeholder", async () => {
    delete process.env.EXPO_PUBLIC_FOOD_AI_KEY;
    const { analyzeFoodImage } = loadModule();

    await expect(
      analyzeFoodImage({ uri: "file://img.jpg", base64: "abc123" })
    ).rejects.toThrow("Missing AI API key");
  });

  it("throws when image data is missing", async () => {
    process.env.EXPO_PUBLIC_FOOD_AI_KEY = "real-key";
    const { analyzeFoodImage } = loadModule();

    await expect(
      analyzeFoodImage({ uri: "file://img.jpg", base64: "" })
    ).rejects.toThrow("No image data available for analysis");
  });

  it("normalizes a successful model response and includes personal trigger context", async () => {
    process.env.EXPO_PUBLIC_FOOD_AI_KEY = "real-key";

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [
                {
                  text:
                    '```json\\n{"score":"4.4","label":"high risk","confidence":1.2,"reasons":["Spicy","Fried"],"suggestions":"Try grilled","personalTriggerMatch":["onion"," "]}\\n```',
                },
              ],
            },
          },
        ],
      }),
    });

    const { analyzeFoodImage } = loadModule();
    const result = await analyzeFoodImage(
      {
        uri: "file://img.jpg",
        base64: "abcd",
      },
      [{ ingredient: "onion", occurrences: 3, avgSeverity: 4 }]
    );

    expect(result).toEqual({
      score: 4,
      label: "High",
      confidence: 1,
      reasons: ["Spicy", "Fried"],
      suggestions: ["Try grilled"],
      personalTriggerMatch: ["onion"],
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body.contents[0].parts[0].text).toContain("personal triggers");
    expect(body.contents[0].parts[1].inline_data.mime_type).toBe("image/jpeg");
    expect(body.contents[0].parts[1].inline_data.data).toBe("abcd");
  });

  it("throws a helpful error when model output is truncated", async () => {
    process.env.EXPO_PUBLIC_FOOD_AI_KEY = "real-key";

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            finishReason: "MAX_TOKENS",
            content: { parts: [{ text: "not valid json" }] },
          },
        ],
      }),
    });

    const { analyzeFoodImage } = loadModule();

    await expect(
      analyzeFoodImage({ uri: "file://img.jpg", base64: "abcd" })
    ).rejects.toThrow("response was truncated");
  });

  it("returns fallback result when parsing fails without truncation", async () => {
    process.env.EXPO_PUBLIC_FOOD_AI_KEY = "real-key";

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: "not json" }] },
          },
        ],
      }),
    });

    const { analyzeFoodImage } = loadModule();
    const result = await analyzeFoodImage({ uri: "file://img.jpg", base64: "abcd" });

    expect(result).toEqual({
      score: 3,
      label: "Moderate",
      confidence: 0.5,
      reasons: ["We could not confidently read this image. Try a clearer photo."],
      suggestions: ["Retake the photo in better lighting and avoid glare."],
    });
  });

  it("throws when the API responds with non-2xx status", async () => {
    process.env.EXPO_PUBLIC_FOOD_AI_KEY = "real-key";

    global.fetch.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      text: async () => "upstream timeout",
    });

    const { analyzeFoodImage } = loadModule();

    await expect(
      analyzeFoodImage({ uri: "file://img.jpg", base64: "abcd" })
    ).rejects.toThrow("Analysis failed (503): upstream timeout");
  });
});
