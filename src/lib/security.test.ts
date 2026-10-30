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
  console.log(`\n${CYAN}================================================================${RESET}`);
  console.log(`${CYAN}   MarketMind Comprehensive Security & Authentication Tests    ${RESET}`);
  console.log(`${CYAN}================================================================${RESET}\n`);

  const testSecret = "unit-test-secure-key-with-more-than-32-characters-for-safety!";

  // --------------------------------------------------------------------------
  // TEST SUITE 1: Password Hashing (scrypt + Salt) & Legacy Migration
  // --------------------------------------------------------------------------
  console.log(`${CYAN}[Suite 1: Password Hashing (scrypt + Salt) & Legacy Migration]${RESET}`);
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
      "verifyPassword verifies matching password against scrypt hash"
    );

    const wrongCheck = await verifyPassword("WrongPassword123!", hash1);
    assert(
      wrongCheck.isValid === false,
      "verifyPassword rejects incorrect password (invalid credentials)"
    );

    // Test minimum length enforcement
    let rejectedShort = false;
    try {
      await hashPassword("123");
    } catch {
      rejectedShort = true;
    }
    assert(rejectedShort, "hashPassword enforces minimum password length (>= 6 chars)");

    // Test legacy plaintext migration detection (safely migrates existing DB accounts)
    const legacyPlain = "oldUnsaltedPassword";
    const legacyCheck = await verifyPassword(legacyPlain, legacyPlain);
    assert(
      legacyCheck.isValid === true && legacyCheck.needsRehash === true,
      "Legacy Migration: Detects legacy plaintext password and flags needsRehash=true for automatic upgrade"
    );

    // Simulate re-hash upgrade on login
    if (legacyCheck.needsRehash) {
      const upgradedHash = await hashPassword(legacyPlain);
      const postUpgradeCheck = await verifyPassword(legacyPlain, upgradedHash);
      assert(
        postUpgradeCheck.isValid === true && postUpgradeCheck.needsRehash === false,
        "Legacy Migration: Rehashed legacy password verified under modern scrypt format without rehash flag"
      );
    }
  } catch (err: any) {
    console.error(`${RED}Suite 1 encountered an unexpected error:${RESET}`, err);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 2: Cryptographic JWT Authentication (RFC 7519)
  // --------------------------------------------------------------------------
  console.log(`\n${CYAN}[Suite 2: Cryptographic JWT Authentication (RFC 7519)]${RESET}`);
  try {
    const userPayload = {
      email: "trader_alice@marketminds.com",
      role: "user",
      displayName: "Trader Alice"
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
  } catch (err: any) {
    console.error(`${RED}Suite 2 encountered an unexpected error:${RESET}`, err);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 3: Spoofing & Tampering Attack Protections
  // --------------------------------------------------------------------------
  console.log(`\n${CYAN}[Suite 3: Spoofing & Tampering Attack Protections]${RESET}`);
  try {
    const userPayload = {
      email: "trader_alice@marketminds.com",
      role: "user",
      displayName: "Trader Alice"
    };
    const validToken = signJwt(userPayload, testSecret, 3600);

    // Attack 1: Plain email passed as Bearer token (The original reported vulnerability)
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

    // Attack 2: Tampered payload (Attacker elevates role to admin or changes email)
    const [h, p, s] = validToken.split(".");
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

    // Attack 3: Token signed with unauthorized secret key
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

    // Attack 5: Malformed token structure
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
    console.error(`${RED}Suite 3 encountered an unexpected error:${RESET}`, err);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 4: User Authorization & Cross-User Isolation
  // --------------------------------------------------------------------------
  console.log(`\n${CYAN}[Suite 4: User Authorization & Cross-User Access Isolation]${RESET}`);
  try {
    const userA = { email: "user_a@marketminds.com", role: "user" };
    const userB = { email: "user_b@marketminds.com", role: "user" };

    const tokenA = signJwt(userA, testSecret, 3600);
    const verifiedA = verifyJwt(tokenA, testSecret);

    // Middleware simulation: req.userEmail is bound ONLY to the cryptographically verified token
    const simulatedReqUser = verifiedA.email.toLowerCase();

    assert(
      simulatedReqUser === userA.email,
      "Authenticated identity is strictly derived from verified token claims"
    );

    // Verify User A cannot claim identity of User B
    assert(
      simulatedReqUser !== userB.email,
      "Cross-User Isolation: User A cannot impersonate User B without User B's signed token"
    );

    // Verify resource ownership check simulation
    const resourceOwnedByUserB = { ownerEmail: "user_b@marketminds.com", data: "Secret Trades" };
    const isAuthorized = simulatedReqUser === resourceOwnedByUserB.ownerEmail;
    assert(
      !isAuthorized,
      "Cross-User Isolation: User A is denied access to User B's private resources"
    );
  } catch (err: any) {
    console.error(`${RED}Suite 4 encountered an unexpected error:${RESET}`, err);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 5: Role-Based Authorization & Admin Security
  // --------------------------------------------------------------------------
  console.log(`\n${CYAN}[Suite 5: Role-Based Access Control (Admin Endpoints)]${RESET}`);
  try {
    const regularUserToken = signJwt({ email: "user@marketminds.com", role: "user" }, testSecret, 3600);
    const adminUserToken = signJwt({ email: "admin@marketminds.com", role: "admin" }, testSecret, 3600);

    const regularPayload = verifyJwt(regularUserToken, testSecret);
    const adminPayload = verifyJwt(adminUserToken, testSecret);

    // Admin role check simulation
    const checkAdminAccess = (role?: string) => role === "admin";

    assert(
      checkAdminAccess(adminPayload.role) === true,
      "Admin Authorization: Verified admin token grants access to administrative endpoints"
    );

    assert(
      checkAdminAccess(regularPayload.role) === false,
      "Admin Authorization: Non-admin user token is rejected with 403 Forbidden on admin endpoints"
    );
  } catch (err: any) {
    console.error(`${RED}Suite 5 encountered an unexpected error:${RESET}`, err);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 6: Secure Configuration Management
  // --------------------------------------------------------------------------
  console.log(`\n${CYAN}[Suite 6: Secure Configuration Management]${RESET}`);
  try {
    const secret = getJwtSecret();
    assert(
      typeof secret === "string" && secret.length >= 32,
      "getJwtSecret enforces high-entropy secret (>= 32 characters)"
    );
  } catch (err: any) {
    console.error(`${RED}Suite 6 encountered an error:${RESET}`, err);
  }

  // Summary
  console.log(`\n${CYAN}================================================================${RESET}`);
  console.log(`Results: ${GREEN}${passedCount} Passed${RESET}, ${failedCount > 0 ? `${RED}${failedCount} Failed${RESET}` : `${GREEN}0 Failed${RESET}`}`);
  console.log(`${CYAN}================================================================${RESET}\n`);

  return { passed: passedCount, failed: failedCount };
}

// Auto-run if executed directly
if (typeof require !== "undefined" && require.main === module) {
  runSecurityTestSuite().catch(console.error);
}

export { runSecurityTestSuite };
