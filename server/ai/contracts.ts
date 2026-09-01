export type AIOperation = "food" | "menu" | "doctor";

export type AIRequestEnvelope = { request: Record<string, unknown> };
export type ValidatedAIRequest = {
  request: Record<string, any>;
  requestBytes: number;
};

export const MAX_AI_BODY_BYTES = 4_300_000;
export const MAX_SCAN_IMAGE_BYTES = 3_000_000;

const POLICIES = {
  food: { images: 1, maxOutputTokens: 4608, timeoutMs: 35_000 },
  menu: { images: 1, maxOutputTokens: 4096, timeoutMs: 35_000 },
  doctor: { images: 0, maxOutputTokens: 180, timeoutMs: 25_000 },
} as const;

const ALLOWED_REQUEST_KEYS = new Set([
  "system_instruction",
  "contents",
  "generationConfig",
]);
const ALLOWED_GENERATION_KEYS = new Set([
  "maxOutputTokens",
  "temperature",
  "responseMimeType",
  "responseSchema",
  "thinkingConfig",
  "mediaResolution",
]);
const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
]);

export class AIHttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "AIHttpError";
    this.status = status;
    this.code = code;
  }
}

const decodedBase64Bytes = (value: string): number => {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 === 1) {
    throw new AIHttpError(400, "invalid_image", "Invalid image encoding");
  }
  return Buffer.from(value, "base64").byteLength;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const invalidRequest = (message: string): never => {
  throw new AIHttpError(400, "invalid_request", message);
};

const rejectUnknownKeys = (
  value: Record<string, unknown>,
  allowedKeys: Set<string>,
  location: string
): void => {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      invalidRequest(`Unknown ${location} field`);
    }
  }
};

const validateParts = (parts: unknown, imageCount: { value: number }): void => {
  if (!Array.isArray(parts) || parts.length === 0) {
    return invalidRequest("Parts must be a non-empty array");
  }

  for (const part of parts) {
    if (!isRecord(part)) {
      return invalidRequest("Each part must be an object");
    }

    const keys = Object.keys(part);
    const hasText = keys.includes("text");
    const hasImage = keys.includes("inline_data");
    if (keys.length !== 1 || hasText === hasImage) {
      return invalidRequest("Each part must contain exactly one supported value");
    }

    if (hasText) {
      if (typeof part.text !== "string") {
        return invalidRequest("Text parts must contain a string");
      }
      if (part.text.length > 40_000) {
        return invalidRequest("Text parts may not exceed 40,000 characters");
      }
      continue;
    }

    if (!isRecord(part.inline_data)) {
      return invalidRequest("Image parts must contain inline image data");
    }
    const imageData = part.inline_data;
    if (
      Object.keys(imageData).length !== 2 ||
      !("mime_type" in imageData) ||
      !("data" in imageData) ||
      typeof imageData.mime_type !== "string" ||
      typeof imageData.data !== "string" ||
      !IMAGE_MIME_TYPES.has(imageData.mime_type)
    ) {
      return invalidRequest("Unsupported inline image");
    }
    if (decodedBase64Bytes(imageData.data) > MAX_SCAN_IMAGE_BYTES) {
      throw new AIHttpError(413, "image_too_large", "Image exceeds the byte limit");
    }
    imageCount.value += 1;
  }
};

const validateContent = (value: unknown, imageCount: { value: number }): void => {
  if (!isRecord(value)) {
    return invalidRequest("Content must be an object");
  }
  validateParts(value.parts, imageCount);
};

export const validateAIRequest = (
  operation: AIOperation,
  body: unknown
): ValidatedAIRequest => {
  if (!(operation in POLICIES)) {
    return invalidRequest("Unsupported AI operation");
  }
  if (!isRecord(body)) {
    return invalidRequest("Request body must be an object");
  }

  const serializedBody = (() => {
    try {
      const serialized = JSON.stringify(body);
      return typeof serialized === "string"
        ? serialized
        : invalidRequest("Request body must be JSON serializable");
    } catch {
      return invalidRequest("Request body must be JSON serializable");
    }
  })();
  const requestBytes = Buffer.byteLength(serializedBody);
  if (requestBytes > MAX_AI_BODY_BYTES) {
    throw new AIHttpError(413, "body_too_large", "Request body exceeds the byte limit");
  }

  const envelope = JSON.parse(serializedBody) as Record<string, unknown>;
  rejectUnknownKeys(envelope, new Set(["request"]), "envelope");
  const request = envelope.request;
  if (!isRecord(request)) {
    return invalidRequest("Envelope request must be an object");
  }

  rejectUnknownKeys(request, ALLOWED_REQUEST_KEYS, "request");
  if (!Array.isArray(request.contents) || request.contents.length !== 1) {
    return invalidRequest("Request must contain exactly one content entry");
  }
  const generationConfig = request.generationConfig;
  if (!isRecord(generationConfig)) {
    return invalidRequest("Generation config must be an object");
  }

  rejectUnknownKeys(generationConfig, ALLOWED_GENERATION_KEYS, "generation config");
  if (generationConfig.responseMimeType !== "application/json") {
    return invalidRequest("Response MIME type must be application/json");
  }
  if (!isRecord(generationConfig.responseSchema)) {
    return invalidRequest("Response schema must be an object");
  }

  const imageCount = { value: 0 };
  if (request.system_instruction !== undefined) {
    validateContent(request.system_instruction, imageCount);
  }
  validateContent(request.contents[0], imageCount);

  const policy = POLICIES[operation];
  if (imageCount.value !== policy.images) {
    return invalidRequest("Unexpected image count for operation");
  }

  const requestedTokens = Number(generationConfig.maxOutputTokens);
  generationConfig.maxOutputTokens = operation === "doctor"
    ? 180
    : Math.min(
        Number.isFinite(requestedTokens) && requestedTokens > 0
          ? requestedTokens
          : policy.maxOutputTokens,
        policy.maxOutputTokens
      );
  generationConfig.responseMimeType = "application/json";
  generationConfig.thinkingConfig = { thinkingLevel: "minimal" };
  if (operation === "doctor") {
    generationConfig.temperature = 0;
    delete generationConfig.mediaResolution;
  } else {
    generationConfig.mediaResolution = "MEDIA_RESOLUTION_HIGH";
  }

  return { request, requestBytes };
};
