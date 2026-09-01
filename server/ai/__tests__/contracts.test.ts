import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AIHttpError,
  MAX_AI_BODY_BYTES,
  validateAIRequest,
} from "../contracts.ts";

const doctorBody = {
  request: {
    system_instruction: { role: "system", parts: [{ text: "Select fact IDs." }] },
    contents: [{ role: "user", parts: [{ text: "Question and allowed facts" }] }],
    generationConfig: {
      maxOutputTokens: 999,
      temperature: 0.8,
      responseMimeType: "application/json",
      responseSchema: { type: "OBJECT", properties: {} },
    },
  },
};

const foodBody = {
  request: {
    system_instruction: { role: "system", parts: [{ text: "Analyze this food." }] },
    contents: [{
      role: "user",
      parts: [
        { text: "What is this?" },
        { inline_data: { mime_type: "image/jpeg", data: "AQID" } },
      ],
    }],
    generationConfig: {
      maxOutputTokens: 3072,
      responseMimeType: "application/json",
      responseSchema: { type: "OBJECT", properties: {} },
    },
  },
};

const invalidCases = [
  ["unknown envelope key", { request: doctorBody.request, model: "other" }, 400],
  ["missing JSON response", { request: { ...doctorBody.request, generationConfig: {} } }, 400],
  ["remote file reference", { request: { ...doctorBody.request, contents: [{ role: "user", parts: [{ file_data: { file_uri: "https://example.test/a" } }] }] } }, 400],
  ["bad MIME", { request: { ...doctorBody.request, contents: [{ role: "user", parts: [{ text: "x" }, { inline_data: { mime_type: "application/pdf", data: "AQID" } }] }] } }, 400],
] as const;

describe("validateAIRequest", () => {
  it("forces the doctor cost and determinism limits", () => {
    const value = validateAIRequest("doctor", doctorBody);
    assert.equal(value.request.generationConfig.maxOutputTokens, 180);
    assert.equal(value.request.generationConfig.temperature, 0);
    assert.equal("mediaResolution" in value.request.generationConfig, false);
  });

  it("rejects a generic-proxy field before any upstream call", () => {
    assert.throws(
      () => validateAIRequest("doctor", {
        request: { ...doctorBody.request, tools: [{ googleSearch: {} }] },
      }),
      (error: unknown) => error instanceof AIHttpError && error.status === 400
    );
  });

  it("rejects image data on the doctor route", () => {
    const withImage = structuredClone(doctorBody);
    withImage.request.contents[0].parts.push({
      inline_data: { mime_type: "image/jpeg", data: "AQID" },
    } as never);
    assert.throws(() => validateAIRequest("doctor", withImage), AIHttpError);
  });

  it("rejects a body beyond the proxy byte budget", () => {
    const large = structuredClone(doctorBody);
    large.request.contents[0].parts[0].text = "x".repeat(MAX_AI_BODY_BYTES);
    assert.throws(
      () => validateAIRequest("doctor", large),
      (error: unknown) => error instanceof AIHttpError && error.status === 413
    );
  });

  for (const [name, body, status] of invalidCases) {
    it(`rejects ${name}`, () => {
      assert.throws(
        () => validateAIRequest("doctor", body),
        (error: unknown) => error instanceof AIHttpError && error.status === status
      );
    });
  }

  it("preserves a valid food token request and forces high image resolution", () => {
    const value = validateAIRequest("food", foodBody);
    assert.equal(value.request.generationConfig.maxOutputTokens, 3072);
    assert.equal(value.request.generationConfig.mediaResolution, "MEDIA_RESOLUTION_HIGH");
  });

  it("clamps food output tokens and requires exactly one image", () => {
    const overBudget = structuredClone(foodBody);
    overBudget.request.generationConfig.maxOutputTokens = 9999;
    assert.equal(validateAIRequest("food", overBudget).request.generationConfig.maxOutputTokens, 4608);

    const withoutImage = structuredClone(foodBody);
    withoutImage.request.contents[0].parts.pop();
    assert.throws(() => validateAIRequest("food", withoutImage), AIHttpError);
  });

  it("clamps menu output tokens and forces high image resolution", () => {
    const menuBody = structuredClone(foodBody);
    menuBody.request.generationConfig.maxOutputTokens = 9999;
    const value = validateAIRequest("menu", menuBody);
    assert.equal(value.request.generationConfig.maxOutputTokens, 4096);
    assert.equal(value.request.generationConfig.mediaResolution, "MEDIA_RESOLUTION_HIGH");
  });
});
