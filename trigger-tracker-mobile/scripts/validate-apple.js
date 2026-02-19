#!/usr/bin/env node

/**
 * Pre-build App Store Connect credential validator.
 * - Normalizes private keys (handles \\n and base64).
 * - Ensures ES256 / P-256 compliance.
 * - Generates a short-lived JWT.
 * - Calls Apple's read-only apps endpoint to ensure Apple accepts the token.
 *
 * Apple is strict about JWT shape and key formatting. Fail fast here so CI and
 * local builds stop with actionable errors instead of silent ASC rejections.
 */

const fs = require("fs");
const https = require("https");
const path = require("path");
const {
  APP_STORE_AUDIENCE,
  generateAppleJwt,
  validateAppleCredentials,
} = require("../utils/appleAppStoreConnect");

const APPLE_ENDPOINT = "https://api.appstoreconnect.apple.com/v1/apps?limit=1";

function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    if (!line || /^\s*#/.test(line)) return;
    const [rawKey, ...rest] = line.split("=");
    if (!rawKey || !rest.length) return;
    const key = rawKey.trim();
    if (process.env[key]) return;
    const value = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
    process.env[key] = value;
  });
}

function readCredentialsFromEnv() {
  loadDotEnv();

  const keyId =
    process.env.APPLE_API_KEY_ID ||
    process.env.APP_STORE_CONNECT_KEY_ID ||
    process.env.ASC_KEY_ID ||
    "";

  const issuerId =
    process.env.APPLE_API_ISSUER_ID ||
    process.env.APP_STORE_CONNECT_ISSUER_ID ||
    process.env.ASC_ISSUER_ID ||
    "";

  const privateKeyBase64 =
    process.env.APPLE_PRIVATE_KEY_BASE64 || process.env.APP_STORE_CONNECT_PRIVATE_KEY_BASE64 || "";

  const privateKey =
    process.env.APPLE_PRIVATE_KEY ||
    process.env.APP_STORE_CONNECT_PRIVATE_KEY ||
    process.env.APPLE_API_PRIVATE_KEY ||
    "";

  return {
    keyId,
    issuerId,
    privateKeyBase64: privateKeyBase64 || undefined,
    privateKey: privateKey || undefined,
  };
}

function fetchFromApple(jwt) {
  return new Promise((resolve, reject) => {
    const request = https.request(
      APPLE_ENDPOINT,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: "application/json",
        },
      },
      (response) => {
        let body = "";

        response.on("data", (chunk) => {
          body += chunk;
        });

        response.on("end", () => {
          const status = response.statusCode || 0;
          if (status >= 200 && status < 300) {
            resolve({ ok: true, status, body });
            return;
          }

          let parsed = null;
          try {
            parsed = JSON.parse(body);
          } catch (_) {
            // Parsed remains null; we only care for improved error messaging.
          }

          const appleMessage = parsed?.errors
            ?.map((error) => `${error.code || error.status || "error"}: ${error.detail || error.title || ""}`)
            .join(" | ");

          const message =
            appleMessage ||
            `Apple rejected the token with status ${status}. Ensure the key is valid and has App Store Connect API access.`;

          resolve({ ok: false, status, body, message });
        });
      }
    );

    request.on("error", (error) => {
      reject(
        new Error(
          `Failed to reach Apple (${APPLE_ENDPOINT}): ${error.message}. Check network access and that Apple API is reachable.`
        )
      );
    });

    request.setTimeout(10000, () => {
      request.destroy(new Error("Apple API request timed out."));
    });

    request.end();
  });
}

async function main() {
  try {
    const credentials = readCredentialsFromEnv();
    const validated = validateAppleCredentials(credentials);
    const jwt = generateAppleJwt(validated);
    const now = Math.floor(Date.now() / 1000);
    const payloadPreview = {
      iss: validated.issuerId,
      aud: APP_STORE_AUDIENCE,
      iat: now,
      exp: now + 15 * 60,
    };

    console.log("✅ ASC credentials normalized and JWT generated (ES256, aud=%s).", APP_STORE_AUDIENCE);
    console.log(
      "   Using keyId=%s issuerId=%s exp(in %ss)",
      validated.keyId,
      validated.issuerId,
      payloadPreview.exp - payloadPreview.iat
    );
    console.log("🔎 Verifying token against Apple (read-only apps list)...");

    const result = await fetchFromApple(jwt);
    if (!result.ok) {
      console.error(
        `❌ Apple rejected the token (status ${result.status}). Details: ${result.message || result.body || "unknown"}`
      );
      console.error(
        "   Common fixes: confirm Key ID matches this .p8, Issuer ID is correct from ASC, the key is not revoked, your user has API access (Admin/App Manager/Account Holder), and system clock is accurate."
      );
      process.exit(1);
    }

    console.log("🎉 Apple accepted the token. ASC credentials are valid for build/deploy.");
  } catch (error) {
    console.error("❌ ASC validation failed:", error.message);
    process.exit(1);
  }
}

main();
