import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppCheckConfigurationError } from "../appCheck.ts";
import { createAIHandler } from "../handler.ts";

const promptMarker = "PROMPT_MARKER_DO_NOT_LOG";
const tokenMarker = "TOKEN_MARKER_DO_NOT_LOG";
const keyMarker = "KEY_MARKER_DO_NOT_LOG";
const responseByteLimit = 1_000_000;

const validEnv = {
  GEMINI_API_KEY: keyMarker,
  GEMINI_MODEL: "gemini-3.5-flash",
  FIREBASE_APP_CHECK_APP_IDS: "ios-app-id, android-app-id",
  FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    project_id: "test-project",
    client_email: "test@test-project.iam.gserviceaccount.com",
    private_key: "test-key",
  }),
};

const validRequest = {
  method: "POST",
  headers: {
    "content-type": "application/json; charset=utf-8",
    "x-firebase-appcheck": tokenMarker,
  },
  body: {
    request: {
      system_instruction: {
        role: "system",
        parts: [{ text: "Select IDs" }],
      },
      contents: [{ role: "user", parts: [{ text: promptMarker }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: { type: "OBJECT", properties: {} },
      },
    },
  },
};

type ResponseDouble = ReturnType<typeof makeResponse>;

function makeResponse() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    status(statusCode: number) {
      this.statusCode = statusCode;
      return this;
    },
    setHeader(name: string, value: string | number | readonly string[]) {
      this.headers[name.toLowerCase()] = Array.isArray(value)
        ? value.join(", ")
        : String(value);
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
}

const invoke = async (
  handler: ReturnType<typeof createAIHandler>,
  request: typeof validRequest | Record<string, unknown> = validRequest
): Promise<ResponseDouble> => {
  const response = makeResponse();
  await handler(request as never, response as never);
  return response;
};

const silentLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const passingVerifyToken = async () => ({ app_id: "ios-app-id" });

const successFetch: typeof fetch = async () => new Response(
  JSON.stringify({ candidates: [] }),
  { status: 200, headers: { "content-type": "application/json" } }
);

const jsonObjectWithSerializedBytes = (totalBytes: number): string => {
  const prefix = '{"value":"';
  const suffix = '"}';
  const json = `${prefix}${"x".repeat(totalBytes - prefix.length - suffix.length)}${suffix}`;
  assert.equal(Buffer.byteLength(json), totalBytes);
  return json;
};

describe("createAIHandler", () => {
  it("returns 405 with Allow: POST for unsupported methods", async () => {
    const handler = createAIHandler("doctor", {
      verifyToken: passingVerifyToken,
      fetchImpl: successFetch,
      env: validEnv,
      logger: silentLogger,
    });

    const response = await invoke(handler, { ...validRequest, method: "GET" });

    assert.equal(response.statusCode, 405);
    assert.equal(response.headers.allow, "POST");
  });

  it("returns 415 for a non-JSON content type", async () => {
    const handler = createAIHandler("doctor", {
      verifyToken: passingVerifyToken,
      fetchImpl: successFetch,
      env: validEnv,
      logger: silentLogger,
    });

    const response = await invoke(handler, {
      ...validRequest,
      headers: {
        ...validRequest.headers,
        "content-type": "text/plain",
      },
    });

    assert.equal(response.statusCode, 415);
  });

  it("rejects a missing App Check token before verification or Gemini", async () => {
    let verifierCalls = 0;
    let upstreamCalls = 0;
    const handler = createAIHandler("doctor", {
      verifyToken: async () => {
        verifierCalls += 1;
        return { app_id: "ios-app-id" };
      },
      fetchImpl: async () => {
        upstreamCalls += 1;
        throw new Error("unreachable");
      },
      env: validEnv,
      logger: silentLogger,
    });

    const response = await invoke(handler, {
      ...validRequest,
      headers: { "content-type": "application/json" },
    });

    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.body, { error: "unauthorized" });
    assert.equal(verifierCalls, 0);
    assert.equal(upstreamCalls, 0);
  });

  it("rejects an invalid App Check token without calling Gemini", async () => {
    let upstreamCalls = 0;
    const handler = createAIHandler("doctor", {
      verifyToken: async () => {
        throw new Error("invalid token");
      },
      fetchImpl: async () => {
        upstreamCalls += 1;
        throw new Error("unreachable");
      },
      env: validEnv,
      logger: silentLogger,
    });

    const response = await invoke(handler);

    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.body, { error: "unauthorized" });
    assert.equal(upstreamCalls, 0);
  });

  it("maps Firebase Admin configuration failures to 503 without calling Gemini", async () => {
    let upstreamCalls = 0;
    const handler = createAIHandler("doctor", {
      verifyToken: async () => {
        throw new AppCheckConfigurationError(new SyntaxError("malformed config"));
      },
      fetchImpl: async () => {
        upstreamCalls += 1;
        throw new Error("unreachable");
      },
      env: validEnv,
      logger: silentLogger,
    });

    const response = await invoke(handler);

    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.body, { error: "service_unavailable" });
    assert.equal(upstreamCalls, 0);
  });

  it("reads App Check and content-type headers case-insensitively", async () => {
    let receivedToken = "";
    const handler = createAIHandler("doctor", {
      verifyToken: async (token) => {
        receivedToken = token;
        return { app_id: "ios-app-id" };
      },
      fetchImpl: successFetch,
      env: validEnv,
      logger: silentLogger,
    });

    const response = await invoke(handler, {
      ...validRequest,
      headers: {
        "Content-Type": "application/json",
        "X-Firebase-AppCheck": tokenMarker,
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(receivedToken, tokenMarker);
  });

  it("accepts a case-insensitive JSON media type with parameters", async () => {
    const handler = createAIHandler("doctor", {
      verifyToken: passingVerifyToken,
      fetchImpl: async () => new Response(JSON.stringify({ candidates: [] }), {
        status: 200,
        headers: { "content-type": "Application/JSON; Charset=UTF-8" },
      }),
      env: validEnv,
      logger: silentLogger,
    });

    const response = await invoke(handler, {
      ...validRequest,
      headers: {
        "content-type": "APPLICATION/JSON ; charset=UTF-8",
        "x-firebase-appcheck": tokenMarker,
      },
    });

    assert.equal(response.statusCode, 200);
  });

  it("rejects a verified token for an unapproved Firebase app", async () => {
    let upstreamCalls = 0;
    const handler = createAIHandler("doctor", {
      verifyToken: async () => ({ app_id: "unapproved-app-id" }),
      fetchImpl: async () => {
        upstreamCalls += 1;
        throw new Error("unreachable");
      },
      env: validEnv,
      logger: silentLogger,
    });

    const response = await invoke(handler);

    assert.equal(response.statusCode, 403);
    assert.equal(upstreamCalls, 0);
  });

  it("returns a validation 400 without calling Gemini", async () => {
    let upstreamCalls = 0;
    const handler = createAIHandler("doctor", {
      verifyToken: passingVerifyToken,
      fetchImpl: async () => {
        upstreamCalls += 1;
        throw new Error("unreachable");
      },
      env: validEnv,
      logger: silentLogger,
    });

    const response = await invoke(handler, { ...validRequest, body: { request: {} } });

    assert.equal(response.statusCode, 400);
    assert.equal(upstreamCalls, 0);
  });

  it("returns 400 when reading the request body throws", async () => {
    let upstreamCalls = 0;
    const malformedRequest = { ...validRequest };
    Object.defineProperty(malformedRequest, "body", {
      get() {
        throw new Error("malformed body getter");
      },
    });
    const handler = createAIHandler("doctor", {
      verifyToken: passingVerifyToken,
      fetchImpl: async () => {
        upstreamCalls += 1;
        throw new Error("unreachable");
      },
      env: validEnv,
      logger: silentLogger,
    });

    const response = await invoke(handler, malformedRequest);

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.body, { error: "invalid_request" });
    assert.equal(upstreamCalls, 0);
  });

  it("forwards the validated request with the server key and never returns it", async () => {
    let upstreamUrl = "";
    let upstreamHeaders: Record<string, string> = {};
    let upstreamBody = "";
    const handler = createAIHandler("doctor", {
      verifyToken: passingVerifyToken,
      fetchImpl: async (url, init) => {
        upstreamUrl = String(url);
        upstreamHeaders = init?.headers as Record<string, string>;
        upstreamBody = String(init?.body);
        return new Response(JSON.stringify({ candidates: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
      env: validEnv,
      logger: silentLogger,
    });

    const response = await invoke(handler);

    assert.equal(
      upstreamUrl,
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent"
    );
    assert.equal(upstreamHeaders["Content-Type"], "application/json");
    assert.equal(upstreamHeaders["x-goog-api-key"], keyMarker);
    assert.equal(JSON.parse(upstreamBody).generationConfig.maxOutputTokens, 180);
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, { candidates: [] });
    assert.equal(JSON.stringify(response.body).includes(keyMarker), false);
  });

  it("uses the operation timeout policy for doctor and scanner requests", async () => {
    const originalTimeout = AbortSignal.timeout;
    const timeoutCalls: number[] = [];
    const controller = new AbortController();
    AbortSignal.timeout = (milliseconds: number) => {
      timeoutCalls.push(milliseconds);
      return controller.signal;
    };

    try {
      const common = {
        verifyToken: passingVerifyToken,
        fetchImpl: successFetch,
        env: validEnv,
        logger: silentLogger,
      };
      await invoke(createAIHandler("doctor", common));

      const scannerRequest = structuredClone(validRequest);
      scannerRequest.body.request.contents[0].parts.push({
        inline_data: { mime_type: "image/jpeg", data: "AQID" },
      } as never);
      await invoke(createAIHandler("food", common), scannerRequest);

      assert.deepEqual(timeoutCalls, [25_000, 35_000]);
    } finally {
      AbortSignal.timeout = originalTimeout;
    }
  });

  it("maps an upstream timeout to 504", async () => {
    const handler = createAIHandler("doctor", {
      verifyToken: passingVerifyToken,
      fetchImpl: async () => {
        throw new DOMException("Timed out", "TimeoutError");
      },
      env: validEnv,
      logger: silentLogger,
    });

    const response = await invoke(handler);

    assert.equal(response.statusCode, 504);
  });

  it("maps an abort while reading the upstream body to 504 and cancels the stream", async () => {
    const originalTimeout = AbortSignal.timeout;
    const abortController = new AbortController();
    let streamCancelled = false;
    let stalledController: ReadableStreamDefaultController<Uint8Array> | undefined;
    let safetyTimer: ReturnType<typeof setTimeout> | undefined;
    AbortSignal.timeout = () => abortController.signal;

    try {
      const handler = createAIHandler("doctor", {
        verifyToken: passingVerifyToken,
        fetchImpl: async () => {
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              stalledController = controller;
              controller.enqueue(new TextEncoder().encode('{"candidates":'));
            },
            pull() {
              return new Promise(() => undefined);
            },
            cancel() {
              streamCancelled = true;
            },
          });
          queueMicrotask(() => abortController.abort(
            new DOMException("Timed out", "TimeoutError")
          ));
          safetyTimer = setTimeout(() => {
            try {
              stalledController?.error(new Error("stream test safety timeout"));
            } catch {
              // The handler already cancelled the stream.
            }
          }, 100);
          return new Response(stream, {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        },
        env: validEnv,
        logger: silentLogger,
      });

      const response = await invoke(handler);

      assert.equal(response.statusCode, 504);
      assert.equal(streamCancelled, true);
    } finally {
      if (safetyTimer) clearTimeout(safetyTimer);
      AbortSignal.timeout = originalTimeout;
    }
  });

  it("normalizes an upstream 429 to 503", async () => {
    const handler = createAIHandler("doctor", {
      verifyToken: passingVerifyToken,
      fetchImpl: async () => new Response(JSON.stringify({ error: "rate limited" }), {
        status: 429,
        headers: { "content-type": "application/json" },
      }),
      env: validEnv,
      logger: silentLogger,
    });

    const response = await invoke(handler);

    assert.equal(response.statusCode, 503);
  });

  it("maps an upstream non-JSON response to 502", async () => {
    const handler = createAIHandler("doctor", {
      verifyToken: passingVerifyToken,
      fetchImpl: async () => new Response("gateway html", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
      env: validEnv,
      logger: silentLogger,
    });

    const response = await invoke(handler);

    assert.equal(response.statusCode, 502);
  });

  it("maps a representative non-429 upstream failure to 502", async () => {
    let streamCancelled = false;
    const handler = createAIHandler("doctor", {
      verifyToken: passingVerifyToken,
      fetchImpl: async () => new Response(new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"error":"unavailable"}'));
        },
        cancel() {
          streamCancelled = true;
        },
      }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
      env: validEnv,
      logger: silentLogger,
    });

    const response = await invoke(handler);

    assert.equal(response.statusCode, 502);
    assert.deepEqual(response.body, { error: "bad_gateway" });
    assert.equal(streamCancelled, true);
  });

  it("accepts an upstream JSON object exactly at the response byte limit", async () => {
    const body = jsonObjectWithSerializedBytes(responseByteLimit);
    const handler = createAIHandler("doctor", {
      verifyToken: passingVerifyToken,
      fetchImpl: async () => new Response(body, {
        status: 200,
        headers: {
          "content-type": "application/json",
          "content-length": String(responseByteLimit),
        },
      }),
      env: validEnv,
      logger: silentLogger,
    });

    const response = await invoke(handler);

    assert.equal(response.statusCode, 200);
    assert.equal((response.body as { value: string }).value.length, responseByteLimit - 12);
  });

  it("rejects an oversized declared Content-Length and cancels the body", async () => {
    let streamCancelled = false;
    const handler = createAIHandler("doctor", {
      verifyToken: passingVerifyToken,
      fetchImpl: async () => new Response(new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"candidates":[]}'));
          controller.close();
        },
        cancel() {
          streamCancelled = true;
        },
      }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "content-length": String(responseByteLimit + 1),
        },
      }),
      env: validEnv,
      logger: silentLogger,
    });

    const response = await invoke(handler);

    assert.equal(response.statusCode, 502);
    assert.deepEqual(response.body, { error: "bad_gateway" });
    assert.equal(streamCancelled, true);
  });

  it("rejects an oversized chunked response and cancels its reader", async () => {
    let streamCancelled = false;
    let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
    const body = new TextEncoder().encode(
      jsonObjectWithSerializedBytes(responseByteLimit + 1)
    );
    const safetyTimer = setTimeout(() => {
      try {
        streamController?.error(new Error("stream test safety timeout"));
      } catch {
        // The handler already cancelled the stream.
      }
    }, 100);
    const handler = createAIHandler("doctor", {
      verifyToken: passingVerifyToken,
      fetchImpl: async () => new Response(new ReadableStream<Uint8Array>({
        start(controller) {
          streamController = controller;
          controller.enqueue(body.subarray(0, responseByteLimit));
          controller.enqueue(body.subarray(responseByteLimit));
        },
        cancel() {
          streamCancelled = true;
        },
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
      env: validEnv,
      logger: silentLogger,
    });

    const response = await invoke(handler).finally(() => clearTimeout(safetyTimer));

    assert.equal(response.statusCode, 502);
    assert.deepEqual(response.body, { error: "bad_gateway" });
    assert.equal(streamCancelled, true);
  });

  it("returns 503 when required server configuration is missing", async () => {
    let upstreamCalls = 0;
    const handler = createAIHandler("doctor", {
      verifyToken: passingVerifyToken,
      fetchImpl: async () => {
        upstreamCalls += 1;
        throw new Error("unreachable");
      },
      env: { ...validEnv, GEMINI_API_KEY: undefined },
      logger: silentLogger,
    });

    const response = await invoke(handler);

    assert.equal(response.statusCode, 503);
    assert.equal(upstreamCalls, 0);
  });

  it("ignores empty App ID entries when an allow-listed ID remains", async () => {
    const handler = createAIHandler("doctor", {
      verifyToken: passingVerifyToken,
      fetchImpl: successFetch,
      env: {
        ...validEnv,
        FIREBASE_APP_CHECK_APP_IDS: " , , ios-app-id,  , ",
      },
      logger: silentLogger,
    });

    const response = await invoke(handler);

    assert.equal(response.statusCode, 200);
  });

  it("returns 503 when the App ID allow-list contains only whitespace entries", async () => {
    let verifierCalls = 0;
    const handler = createAIHandler("doctor", {
      verifyToken: async () => {
        verifierCalls += 1;
        return { app_id: "ios-app-id" };
      },
      fetchImpl: successFetch,
      env: {
        ...validEnv,
        FIREBASE_APP_CHECK_APP_IDS: " ,  , ",
      },
      logger: silentLogger,
    });

    const response = await invoke(handler);

    assert.equal(response.statusCode, 503);
    assert.equal(verifierCalls, 0);
  });

  it("rejects a non-allow-listed Gemini model before forwarding", async () => {
    let upstreamCalls = 0;
    const handler = createAIHandler("doctor", {
      verifyToken: passingVerifyToken,
      fetchImpl: async () => {
        upstreamCalls += 1;
        throw new Error("unreachable");
      },
      env: { ...validEnv, GEMINI_MODEL: "gemini-other" },
      logger: silentLogger,
    });

    const response = await invoke(handler);

    assert.equal(response.statusCode, 503);
    assert.equal(upstreamCalls, 0);
  });

  it("logs only bounded request metadata without prompts, tokens, keys, or responses", async () => {
    const loggerCalls: unknown[][] = [];
    const logger = {
      info: (...args: unknown[]) => loggerCalls.push(args),
      warn: (...args: unknown[]) => loggerCalls.push(args),
      error: (...args: unknown[]) => loggerCalls.push(args),
    };
    const handler = createAIHandler("doctor", {
      verifyToken: passingVerifyToken,
      fetchImpl: async () => new Response(
        JSON.stringify({ candidates: [{ marker: "RESPONSE_MARKER_DO_NOT_LOG" }] }),
        { status: 200, headers: { "content-type": "application/json" } }
      ),
      env: validEnv,
      logger,
    });

    const response = await invoke(handler);
    const serializedLogs = JSON.stringify(loggerCalls);

    assert.equal(response.statusCode, 200);
    assert.ok(loggerCalls.length > 0);
    assert.equal(serializedLogs.includes(promptMarker), false);
    assert.equal(serializedLogs.includes(tokenMarker), false);
    assert.equal(serializedLogs.includes(keyMarker), false);
    assert.equal(serializedLogs.includes("RESPONSE_MARKER_DO_NOT_LOG"), false);
    for (const [entry] of loggerCalls) {
      assert.deepEqual(
        Object.keys(entry as Record<string, unknown>).sort(),
        [
          "elapsedMs",
          "operation",
          "requestBytes",
          "requestId",
          "status",
          "upstreamStatus",
        ]
      );
    }
  });
});
