import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { verifyAppCheckToken } from "./appCheck.ts";
import {
  AIHttpError,
  type AIOperation,
  validateAIRequest,
} from "./contracts.ts";

const ALLOWED_GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";

const OPERATION_TIMEOUT_MS: Record<AIOperation, number> = {
  food: 35_000,
  menu: 35_000,
  doctor: 25_000,
};

type AppCheckClaims = { app_id?: string };

type HandlerOverrides = {
  verifyToken?: (token: string) => Promise<AppCheckClaims>;
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
  logger?: Pick<Console, "info" | "warn" | "error">;
};

type LogMetadata = {
  requestId: string;
  operation: AIOperation;
  status: number;
  requestBytes: number;
  elapsedMs: number;
  upstreamStatus: number | null;
};

const readHeader = (
  headers: VercelRequest["headers"],
  name: string
): string | undefined => {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target && typeof value === "string") {
      return value;
    }
  }
  return undefined;
};

const isJSONContentType = (contentType: string | undefined): boolean =>
  contentType?.split(";", 1)[0].trim().toLowerCase() === "application/json";

const configuredAppIds = (
  raw: string | undefined
): Set<string> => new Set(
  (raw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);

const isJSONObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isTimeoutError = (error: unknown): boolean =>
  error instanceof Error && (
    error.name === "AbortError" || error.name === "TimeoutError"
  );

export const createAIHandler = (
  operation: AIOperation,
  overrides: HandlerOverrides = {}
) => async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const startedAt = Date.now();
  const requestId = randomUUID();
  const verifyToken = overrides.verifyToken ?? verifyAppCheckToken;
  const fetchImpl = overrides.fetchImpl ?? fetch;
  const env = overrides.env ?? process.env;
  const logger = overrides.logger ?? console;
  let status = 500;
  let requestBytes = 0;
  let upstreamStatus: number | null = null;

  const reply = (statusCode: number, body: Record<string, unknown>): void => {
    status = statusCode;
    res.status(statusCode).json(body);
  };

  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      reply(405, { error: "method_not_allowed" });
      return;
    }

    if (!isJSONContentType(readHeader(req.headers, "content-type"))) {
      reply(415, { error: "unsupported_media_type" });
      return;
    }

    const token = readHeader(req.headers, "x-firebase-appcheck");
    if (!token?.trim()) {
      reply(401, { error: "unauthorized" });
      return;
    }

    const apiKey = env.GEMINI_API_KEY?.trim();
    const model = env.GEMINI_MODEL?.trim();
    const allowedAppIds = configuredAppIds(env.FIREBASE_APP_CHECK_APP_IDS);
    if (
      !apiKey ||
      model !== ALLOWED_GEMINI_MODEL ||
      !env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
      allowedAppIds.size === 0
    ) {
      reply(503, { error: "service_unavailable" });
      return;
    }

    let claims: AppCheckClaims;
    try {
      claims = await verifyToken(token);
    } catch {
      reply(401, { error: "unauthorized" });
      return;
    }

    if (!claims.app_id || !allowedAppIds.has(claims.app_id)) {
      reply(403, { error: "forbidden" });
      return;
    }

    let validated;
    try {
      validated = validateAIRequest(operation, req.body);
      requestBytes = validated.requestBytes;
    } catch (error) {
      if (error instanceof AIHttpError) {
        reply(error.status, { error: error.code });
        return;
      }
      reply(400, { error: "invalid_request" });
      return;
    }

    let upstreamResponse: Response;
    try {
      upstreamResponse = await fetchImpl(
        `${GEMINI_API_ROOT}/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify(validated.request),
          signal: AbortSignal.timeout(OPERATION_TIMEOUT_MS[operation]),
        }
      );
      upstreamStatus = upstreamResponse.status;
    } catch (error) {
      if (isTimeoutError(error)) {
        reply(504, { error: "upstream_timeout" });
        return;
      }
      reply(502, { error: "bad_gateway" });
      return;
    }

    if (upstreamResponse.status === 429) {
      reply(503, { error: "service_unavailable" });
      return;
    }

    if (!upstreamResponse.ok) {
      reply(502, { error: "bad_gateway" });
      return;
    }

    const upstreamContentType = upstreamResponse.headers.get("content-type");
    if (!isJSONContentType(upstreamContentType ?? undefined)) {
      reply(502, { error: "bad_gateway" });
      return;
    }

    let responseBody: unknown;
    try {
      responseBody = await upstreamResponse.json();
    } catch {
      reply(502, { error: "bad_gateway" });
      return;
    }

    if (!isJSONObject(responseBody)) {
      reply(502, { error: "bad_gateway" });
      return;
    }

    reply(200, responseBody);
  } finally {
    const metadata: LogMetadata = {
      requestId,
      operation,
      status,
      requestBytes,
      elapsedMs: Date.now() - startedAt,
      upstreamStatus,
    };
    const log = status >= 500
      ? logger.error
      : status >= 400
        ? logger.warn
        : logger.info;
    try {
      log.call(logger, metadata);
    } catch {
      // Logging must never alter the HTTP response path.
    }
  }
};
