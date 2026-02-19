const { createPrivateKey, sign } = require("crypto");

const APP_STORE_AUDIENCE = "appstoreconnect-v1";
const MAX_TOKEN_LIFETIME_SECONDS = 60 * 20; // Apple rejects tokens longer than 20 minutes.

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function decodeIfBase64(input) {
  if (!/^[A-Za-z0-9+/=\s]+$/.test(input)) {
    return null;
  }

  try {
    const decoded = Buffer.from(input, "base64").toString("utf8");
    if (decoded.includes("PRIVATE KEY-----")) {
      return decoded;
    }
  } catch (error) {
    return null;
  }

  return null;
}

/**
 * Normalize the PEM by fixing escaped newlines and handling base64 encoded values.
 */
function normalizePrivateKey(rawKey) {
  const candidate = rawKey.trim();
  const decoded = decodeIfBase64(candidate);
  const withNewlines = (decoded || candidate).replace(/\\n/g, "\n").trim();

  if (!withNewlines.startsWith("-----BEGIN PRIVATE KEY-----")) {
    throw new Error(
      "ASC privateKey must start with '-----BEGIN PRIVATE KEY-----'. Apple will reject EC keys with missing headers."
    );
  }

  if (!withNewlines.includes("-----END PRIVATE KEY-----")) {
    throw new Error(
      "ASC privateKey must end with '-----END PRIVATE KEY-----'. Ensure the full PEM is provided."
    );
  }

  return withNewlines;
}

function validateEcPrivateKey(pem) {
  let keyObject;
  try {
    keyObject = createPrivateKey({ key: pem, format: "pem" });
  } catch (error) {
    throw new Error(
      `ASC privateKey is not a valid PEM: ${error.message}. Apple requires an unencrypted P-256 EC private key.`
    );
  }

  if (keyObject.type !== "private") {
    throw new Error("ASC privateKey must be a private key, not a certificate or public key.");
  }

  if (keyObject.asymmetricKeyType !== "ec") {
    throw new Error(
      "ASC privateKey must be an EC key (ES256). RSA keys are rejected by App Store Connect."
    );
  }

  const details = keyObject.asymmetricKeyDetails || {};
  if (details.namedCurve && details.namedCurve !== "prime256v1") {
    throw new Error(
      `ASC privateKey must use the P-256 (prime256v1) curve. Found: ${details.namedCurve || "unknown"}`
    );
  }

  return keyObject;
}

function validateAppleCredentials(input) {
  if (!input) {
    throw new Error("Missing ASC credentials. Provide keyId, issuerId, and privateKey.");
  }

  const keyId = (input.keyId || input.key || "").trim();
  const issuerId = (input.issuerId || "").trim();
  const rawPrivateKey = input.privateKey || input.privateKeyBase64 || "";

  if (!keyId) {
    throw new Error("ASC keyId is required (10-character value from App Store Connect).");
  }

  if (!/^[A-Z0-9]{10}$/.test(keyId)) {
    throw new Error(
      "ASC keyId must be 10 uppercase alphanumeric characters. Copy it exactly from App Store Connect > Users and Access."
    );
  }

  if (!issuerId) {
    throw new Error("ASC issuerId (UUID) is required.");
  }

  if (!/^[0-9a-fA-F-]{36}$/.test(issuerId)) {
    throw new Error(
      "ASC issuerId must be a UUID (e.g., 12345678-1234-1234-1234-1234567890ab)."
    );
  }

  if (!rawPrivateKey) {
    throw new Error(
      "ASC privateKey is required. Provide the full PEM or a base64-encoded PEM as APPLE_PRIVATE_KEY_BASE64."
    );
  }

  const normalizedPrivateKey = normalizePrivateKey(rawPrivateKey);
  const privateKeyObject = validateEcPrivateKey(normalizedPrivateKey);

  return {
    keyId,
    issuerId,
    privateKey: normalizedPrivateKey,
    privateKeyObject,
  };
}

function generateAppleJwt({ keyId, issuerId, privateKey, expiresInSeconds = 15 * 60, now }) {
  const issuedAt = now || Math.floor(Date.now() / 1000);
  if (expiresInSeconds <= 0) {
    throw new Error("ASC JWT exp must be a positive number of seconds.");
  }
  if (expiresInSeconds > MAX_TOKEN_LIFETIME_SECONDS) {
    throw new Error("ASC JWT exp must be <= 20 minutes.");
  }

  const { keyId: validKeyId, issuerId: validIssuerId, privateKey: normalized, privateKeyObject } =
    validateAppleCredentials({ keyId, issuerId, privateKey });

  const exp = issuedAt + expiresInSeconds;
  const header = {
    alg: "ES256",
    kid: validKeyId,
    typ: "JWT",
  };

  const payload = {
    iss: validIssuerId,
    iat: issuedAt,
    exp,
    aud: APP_STORE_AUDIENCE,
  };

  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(payload)
  )}`;

  const signature = sign("sha256", Buffer.from(signingInput), {
    key: privateKeyObject || normalized,
    dsaEncoding: "ieee-p1363",
  });

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

module.exports = {
  APP_STORE_AUDIENCE,
  MAX_TOKEN_LIFETIME_SECONDS,
  base64UrlEncode,
  generateAppleJwt,
  normalizePrivateKey,
  validateAppleCredentials,
};
