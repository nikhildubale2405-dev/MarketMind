import crypto from "crypto";

// ============================================================================
// Secure Configuration & Secrets Management
// ============================================================================
const MIN_SECRET_LENGTH = 32;
const DEFAULT_EXPIRATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

export function getJwtSecret(): string {
  const envSecret = process.env.JWT_SECRET?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (!envSecret || envSecret === "JWT_SECRET" || envSecret.length < MIN_SECRET_LENGTH) {
    if (isProduction) {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET environment variable is missing, " +
        `using a placeholder, or shorter than ${MIN_SECRET_LENGTH} characters in production. ` +
        "You must configure a strong random secret before starting in production."
      );
    }
    console.warn(
      `[SECURITY WARNING] JWT_SECRET is unset or shorter than ${MIN_SECRET_LENGTH} characters. ` +
      "Using a development fallback secret. Please configure JWT_SECRET in your .env file."
    );
    return "marketminds-dev-fallback-secret-minimum-32-chars-long!";
  }

  return envSecret;
}

// ============================================================================
// Password Hashing & Verification (scrypt with Salt and Constant-Time Comparison)
// ============================================================================
const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384; // N = 2^14
const SCRYPT_BLOCKSIZE = 8; // r = 8
const SCRYPT_PARALLELIZATION = 1; // p = 1

export interface HashResult {
  hash: string;
}

/**
 * Hashes a plaintext password using crypto.scrypt with a random 16-byte salt.
 * Output format: scrypt:<salt_hex>:<derived_key_hex>
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string.");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  const salt = crypto.randomBytes(16);

  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      SCRYPT_KEYLEN,
      { N: SCRYPT_COST, r: SCRYPT_BLOCKSIZE, p: SCRYPT_PARALLELIZATION },
      (err, derivedKey) => {
        if (err) return reject(err);
        resolve(`scrypt:${salt.toString("hex")}:${derivedKey.toString("hex")}`);
      }
    );
  });
}

/**
 * Verifies a plaintext password against a stored hash string.
 * Uses crypto.timingSafeEqual to prevent side-channel timing attacks.
 * Also safely detects and handles legacy plain text hashes for automatic upgrade.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<{ isValid: boolean; needsRehash: boolean }> {
  if (!password || !storedHash) {
    return { isValid: false, needsRehash: false };
  }

  // Handle modern scrypt hash format
  if (storedHash.startsWith("scrypt:")) {
    const parts = storedHash.split(":");
    if (parts.length !== 3) {
      return { isValid: false, needsRehash: false };
    }

    const salt = Buffer.from(parts[1], "hex");
    const originalDerivedKey = Buffer.from(parts[2], "hex");

    return new Promise((resolve) => {
      crypto.scrypt(
        password,
        salt,
        originalDerivedKey.length,
        { N: SCRYPT_COST, r: SCRYPT_BLOCKSIZE, p: SCRYPT_PARALLELIZATION },
        (err, derivedKey) => {
          if (err) return resolve({ isValid: false, needsRehash: false });

          try {
            const matches = crypto.timingSafeEqual(originalDerivedKey, derivedKey);
            resolve({ isValid: matches, needsRehash: false });
          } catch {
            resolve({ isValid: false, needsRehash: false });
          }
        }
      );
    });
  }

  // Legacy fallback check: If the stored password was saved as plain text before this fix,
  // we do a timing-safe check and signal that it must be re-hashed to scrypt immediately.
  const storedBuffer = Buffer.from(storedHash);
  const passBuffer = Buffer.from(password);
  const isMatch =
    storedBuffer.length === passBuffer.length &&
    crypto.timingSafeEqual(storedBuffer, passBuffer);

  return { isValid: isMatch, needsRehash: isMatch };
}

// ============================================================================
// Standard Cryptographic JWT (RFC 7519 HMAC-SHA256) Implementation
// ============================================================================
function base64UrlEncode(strOrBuffer: string | Buffer): string {
  const buf = Buffer.isBuffer(strOrBuffer) ? strOrBuffer : Buffer.from(strOrBuffer);
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

export interface JwtPayload {
  email: string;
  role?: string;
  displayName?: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

/**
 * Creates and signs a standard HS256 JWT using Node's crypto HMAC-SHA256.
 */
export function signJwt(
  payload: Omit<JwtPayload, "iat" | "exp">,
  secret: string = getJwtSecret(),
  expiresInSeconds: number = DEFAULT_EXPIRATION_SECONDS
): string {
  const header = {
    alg: "HS256",
    typ: "JWT"
  };

  const nowSeconds = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: nowSeconds,
    exp: nowSeconds + expiresInSeconds
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(dataToSign)
    .digest();
  const encodedSignature = base64UrlEncode(signature);

  return `${dataToSign}.${encodedSignature}`;
}

/**
 * Verifies a HS256 JWT token using crypto.timingSafeEqual.
 * Throws specific, descriptive errors on invalid signature or expiration.
 */
export function verifyJwt(token: string, secret: string = getJwtSecret()): JwtPayload {
  if (!token || typeof token !== "string") {
    throw new Error("Token must be a non-empty string.");
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token format: expected 3 dot-separated segments.");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  // Verify header
  try {
    const header = JSON.parse(base64UrlDecode(encodedHeader));
    if (header.alg !== "HS256" || header.typ !== "JWT") {
      throw new Error("Unsupported token algorithm or type.");
    }
  } catch (err: any) {
    throw new Error(`Invalid token header: ${err.message}`);
  }

  // Calculate expected signature
  const expectedSignatureBuf = crypto
    .createHmac("sha256", secret)
    .update(dataToSign)
    .digest();

  // Decode provided signature
  let providedSignatureBuf: Buffer;
  try {
    let sigBase64 = encodedSignature.replace(/-/g, "+").replace(/_/g, "/");
    while (sigBase64.length % 4) {
      sigBase64 += "=";
    }
    providedSignatureBuf = Buffer.from(sigBase64, "base64");
  } catch {
    throw new Error("Invalid token signature encoding.");
  }

  if (
    expectedSignatureBuf.length !== providedSignatureBuf.length ||
    !crypto.timingSafeEqual(expectedSignatureBuf, providedSignatureBuf)
  ) {
    throw new Error("Invalid token signature: token has been modified or signature key does not match.");
  }

  // Parse and validate payload
  let payload: JwtPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch (err: any) {
    throw new Error(`Invalid token payload: ${err.message}`);
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < nowSeconds) {
    throw new Error("Token has expired. Please log in again.");
  }

  if (!payload.email) {
    throw new Error("Token payload is missing required 'email' claim.");
  }

  return payload;
}
