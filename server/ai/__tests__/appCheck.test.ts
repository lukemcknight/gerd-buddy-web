import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { verifyAppCheckToken } from "../appCheck.ts";

const captureRejection = async (operation: () => Promise<unknown>) => {
  try {
    await operation();
  } catch (error) {
    return error;
  }
  assert.fail("Expected operation to reject");
};

describe("verifyAppCheckToken", () => {
  it("classifies malformed Admin configuration and retries initialization", async () => {
    const original = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    try {
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON = "{";
      const malformedJSONError = await captureRejection(
        () => verifyAppCheckToken("not-a-real-token")
      );

      process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({
        project_id: "second-test-project",
      });
      const malformedStructureError = await captureRejection(
        () => verifyAppCheckToken("not-a-real-token")
      );

      assert.equal((malformedJSONError as Error).name, "AppCheckConfigurationError");
      assert.equal((malformedStructureError as Error).name, "AppCheckConfigurationError");
      assert.notEqual(malformedStructureError, malformedJSONError);
      assert.notEqual(
        (malformedStructureError as Error & { cause?: unknown }).cause,
        (malformedJSONError as Error & { cause?: unknown }).cause
      );
    } finally {
      if (original === undefined) {
        delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      } else {
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON = original;
      }
    }
  });
});
