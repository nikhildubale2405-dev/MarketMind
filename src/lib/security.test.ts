import {
  hashPassword,
  verifyPassword,
  signJwt,
  verifyJwt,
  getJwtSecret
} from "./authSecurity";

// Colorized test reporter for terminal / node execution
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passedCount++;
    console.log(`  ${GREEN}✔ PASS${RESET}: ${testName}`);
  } else {
    failedCount++;
    console.error(`  ${RED}✖ FAIL${RESET}: ${testName}${detail ? ` (${detail})` : ""}`);
  }
}

async function runSecurityTestSuite() {
  console.log(`\n${CYAN}======================================================${RESET}`);
  console.log(`${CYAN}   MarketMind Security & Authentication Test Suite   ${RESET}`);
  console.log(`${CYAN}======================================================${RESET}\n`);

  const testSecret = "unit-test-secure-key-with-more-than-32-characters-for-safety!";

  // --------------------------------------------------------------------------
  // TEST SUITE 1: Password Hashing & Salt Verification
  // --------------------------------------------------------------------------
  console.log(`${CYAN}[Suite 1: Password Hashing (scrypt + Salt)]${RESET}`);
  try {
    const plainPassword = "SuperSecureTradingPassword!123";
    const hash1 = await hashPassword(plainPassword);
    const hash2 = await hashPassword(plainPassword);

    assert(
      hash1.startsWith("scrypt:") && hash1.split(":").length === 3,
      "Password hash has standard format 'scrypt:<salt>:<derivedKey>'"
    );

    assert(
      hash1 !== plainPassword,
      "Plaintext password is never saved directly"
    );

    assert(
      hash1 !== hash2,
      "Identical passwords produce distinct hashes (cryptographically unique salts)"
    );

    const validCheck = await verifyPassword(plainPassword, hash1);
    assert(
      validCheck.isValid === true && validCheck.needsRehash === false,
      "verifyPassword correctly verifies matching password against scrypt hash"
    );

    const wrongCheck = await verifyPassword("WrongPassword123!", hash1);
    assert(
      wrongCheck.isValid === false,
      "verifyPassword rejects incorrect password"
    );

    // Test minimum length enforcement
    let rejectedShort = false;
    try {
      await hashPassword("123");
    } catch {
      rejectedShort = true;
    }
    assert(rejectedShort, "hashPassword enforces minimum password length (>= 6 chars)");

    // Test legacy plaintext migration detection
    const legacyPlain = "oldUnsaltedPassword";
    const legacyCheck = await verifyPassword(legacyPlain, legacyPlain);
    assert(
      legacyCheck.isValid === true && legacyCheck.needsRehash === true,
      "verifyPassword detects legacy plaintext password and flags for rehash upgrade"
    );
  } catch (err: any) {
    console.error(`${RED}Suite 1 encountered an unexpected error:${RESET}`, err);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 2: Cryptographic JWT Signing & Verification
  // --------------------------------------------------------------------------
  console.log(`\n${CYAN}[Suite 2: Cryptographic JWT Authentication (RFC 7519)]${RESET}`);
  try {
    const userPayload = {
      email: "trader_nick@marketminds.com",
      role: "user",
      displayName: "Trader Nick"
    };

    const token = signJwt(userPayload, testSecret, 3600);
    assert(
      typeof token === "string" && token.split(".").length === 3,
      "signJwt produces standard 3-part dot-separated JWT"
    );

    const verified = verifyJwt(token, testSecret);
    assert(
      verified.email === userPayload.email && verified.role === userPayload.role,
      "verifyJwt verifies valid token and extracts authenticated claims"
    );

    // ------------------------------------------------------------------------
    // TEST SUITE 3: Spoofing & Tampering Attack Protections (The Reported Flaw)
    // ------------------------------------------------------------------------
    console.log(`\n${CYAN}[Suite 3: Attack Protections & Verification Resistance]${RESET}`);

    // Attack 1: Plain email passed as Bearer token (The original vulnerability)
    let emailSpoofBlocked = false;
    try {
      verifyJwt("victim@marketminds.com", testSecret);
    } catch {
      emailSpoofBlocked = true;
    }
    assert(
      emailSpoofBlocked,
      "Vulnerability Fixed: Raw email 'Bearer victim@email.com' is rejected (not a valid token)"
    );

    // Attack 2: Tampered payload (Attacker changes their email to admin)
    const [h, p, s] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...userPayload, role: "admin", email: "admin@marketminds.com" })
    ).toString("base64url");
    const tamperedToken = `${h}.${tamperedPayload}.${s}`;

    let tamperingBlocked = false;
    try {
      verifyJwt(tamperedToken, testSecret);
    } catch {
      tamperingBlocked = true;
    }
    assert(
      tamperingBlocked,
      "Tampered token (payload modified) is cryptographically rejected"
    );

    // Attack 3: Token signed with a different key
    const forgedToken = signJwt(userPayload, "attacker-secret-key-that-does-not-match-server-secrets!", 3600);
    let forgedBlocked = false;
    try {
      verifyJwt(forgedToken, testSecret);
    } catch {
      forgedBlocked = true;
    }
    assert(
      forgedBlocked,
      "Token signed with unauthorized secret key is rejected"
    );

    // Attack 4: Expired token
    const expiredToken = signJwt(userPayload, testSecret, -10); // Expired 10 seconds ago
    let expiredBlocked = false;
    try {
      verifyJwt(expiredToken, testSecret);
    } catch (err: any) {
      if (err.message.includes("expired")) {
        expiredBlocked = true;
      }
    }
    assert(
      expiredBlocked,
      "Expired token is rejected with expiration notice"
    );

    // Attack 5: Malformed token
    let malformedBlocked = false;
    try {
      verifyJwt("not.a.real.jwt.token", testSecret);
    } catch {
      malformedBlocked = true;
    }
    assert(
      malformedBlocked,
      "Malformed token structure is rejected"
    );
  } catch (err: any) {
    console.error(`${RED}Suite 2/3 encountered an unexpected error:${RESET}`, err);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 4: Configuration & Secrets Validation
  // --------------------------------------------------------------------------
  console.log(`\n${CYAN}[Suite 4: Secure Configuration Management]${RESET}`);
  try {
    const secret = getJwtSecret();
    assert(
      typeof secret === "string" && secret.length >= 32,
      "getJwtSecret returns high-entropy secret (>= 32 characters)"
    );
  } catch (err: any) {
    console.error(`${RED}Suite 4 encountered an error:${RESET}`, err);
  }

  // Summary
  console.log(`\n${CYAN}======================================================${RESET}`);
  console.log(`Results: ${GREEN}${passedCount} Passed${RESET}, ${failedCount > 0 ? `${RED}${failedCount} Failed${RESET}` : `${GREEN}0 Failed${RESET}`}`);
  console.log(`${CYAN}======================================================${RESET}\n`);

  return { passed: passedCount, failed: failedCount };
}

// Auto-run if executed directly
if (typeof require !== "undefined" && require.main === module) {
  runSecurityTestSuite().catch(console.error);
}

export { runSecurityTestSuite };
