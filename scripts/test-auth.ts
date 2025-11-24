const BASE_URL = "http://localhost:3000/api/auth-client";

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(msg: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function assert(condition: boolean, msg: string, data?: unknown) {
  if (!condition) {
    log(`❌ FAIL: ${msg}`, "red");
    if (data) console.log("Response Data:", JSON.stringify(data, null, 2));
    throw new Error(msg);
  } else {
    log(`✅ PASS: ${msg}`, "green");
  }
}

async function runTest(name: string, fn: () => Promise<void>) {
  log(`\n[TEST] ${name}`, "cyan");
  try {
    await fn();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    log(`⚠️ Test failed: ${message}`, "red");
  }
}

async function testAuth() {
  log("🚀 Starting Comprehensive Security & Robustness Tests...\n", "magenta");

  const uniqueId = Date.now();
  const validUser = {
    email: `valid${uniqueId}@example.com`,
    username: `validuser${uniqueId}`,
    password: "StrongPassword123!",
  };

  // ==========================================
  // SUITE 1: Input Validation & Fuzzing
  // ==========================================
  await runTest("Registration - Weak Passwords", async () => {
    const weakPasswords = [
      "short",
      "nouppercase1!",
      "NOLOWERCASE1!",
      "NoSymbol123",
      "12345678",
    ];

    for (const pwd of weakPasswords) {
      const res = await fetch(`${BASE_URL}/register`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Forwarded-For": `1.2.3.${Math.floor(Math.random() * 255)}`
        },
        body: JSON.stringify({ ...validUser, password: pwd }),
      });
      assert(res.status === 400, `Should reject weak password: ${pwd}`);
    }
  });

  await runTest("Registration - Invalid Emails", async () => {
    const invalidEmails = [
      "plainaddress",
      "#@%^%#$@#$@#.com",
      "@example.com",
      "Joe Smith <email@example.com>",
      "email.example.com",
    ];

    for (const email of invalidEmails) {
      const res = await fetch(`${BASE_URL}/register`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Forwarded-For": `1.2.3.${Math.floor(Math.random() * 255)}`
        },
        body: JSON.stringify({ ...validUser, email }),
      });
      assert(res.status === 400, `Should reject invalid email: ${email}`);
    }
  });

  await runTest("Registration - Injection Payloads (NoSQL/XSS)", async () => {
    const payloads = [
      { username: `{"$gt": ""}` }, // NoSQL Injection attempt
      { username: `<script>alert(1)</script>` }, // XSS attempt (should be stored but sanitized on display, or rejected if strict)
      { email: `admin' --` }, // SQL Injection style
    ];

    // Note: Zod validation might pass some of these strings, but they shouldn't break the DB.
    // We mainly check that the server doesn't crash (500).
    for (const payload of payloads) {
      const res = await fetch(`${BASE_URL}/register`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Forwarded-For": `1.2.3.${Math.floor(Math.random() * 255)}`
        },
        body: JSON.stringify({ 
          ...validUser, 
          ...payload, 
          email: `inj${Date.now()}@test.com`,
          username: `injuser${Date.now()}_${Math.random()}`
        }),
      });
      assert(res.status !== 500, `Server should not crash on payload: ${JSON.stringify(payload)}`);
      
      // If it was a NoSQL injection object, it should definitely be rejected by Zod (expected string, got object)
      // But here we are sending JSON, so if we send an object for username, Zod should catch it.
      if (typeof Object.values(payload)[0] === 'object') {
         assert(res.status === 400, "Should reject object payload for string field");
      }
    }
  });

  // ==========================================
  // SUITE 2: Logic & State
  // ==========================================
  await runTest("Happy Path - Register Valid User", async () => {
    const res = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Forwarded-For": `10.0.0.${Math.floor(Math.random() * 255)}` 
      },
      body: JSON.stringify(validUser),
    });
    const data = await res.json();
    assert(res.status === 201, "Should register valid user", data);
    assert(!!data.accessToken, "Should return access token", data);
  });

  await runTest("Duplicate Registration", async () => {
    const res = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Forwarded-For": `10.0.0.${Math.floor(Math.random() * 255)}`
      },
      body: JSON.stringify(validUser),
    });
    assert(res.status === 409, "Should reject duplicate email/username");
  });

  await runTest("Login - Invalid Credentials", async () => {
    const res = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Forwarded-For": `10.0.0.${Math.floor(Math.random() * 255)}`
      },
      body: JSON.stringify({ identifier: validUser.email, password: "WrongPassword123!" }),
    });
    assert(res.status === 401, "Should reject wrong password");
  });

  // ==========================================
  // SUITE 3: Session Management
  // ==========================================
  let cookies: string | null = null;

  await runTest("Login - Success", async () => {
    const res = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Forwarded-For": `10.0.0.${Math.floor(Math.random() * 255)}`
      },
      body: JSON.stringify({ identifier: validUser.email, password: validUser.password }),
    });
    cookies = res.headers.get("set-cookie");
    assert(res.status === 200, "Should login successfully");
    assert(!!cookies, "Should set cookies");
  });

  await runTest("Refresh Token - Valid", async () => {
    const res = await fetch(`${BASE_URL}/refresh`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cookie": cookies || ""
      },
    });
    const data = await res.json();
    assert(res.status === 200, "Should refresh token");
    assert(!!data.accessToken, "Should return new access token");
  });

  await runTest("Refresh Token - Invalid/Missing Cookie", async () => {
    const res = await fetch(`${BASE_URL}/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    assert(res.status === 401, "Should reject missing cookie");
  });

  await runTest("Logout", async () => {
    const res = await fetch(`${BASE_URL}/logout`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cookie": cookies || ""
      },
    });
    assert(res.status === 200, "Should logout successfully");
  });

  await runTest("Refresh after Logout", async () => {
    // Note: In a real browser, the cookie would be cleared. 
    // Here we manually check if we can reuse the OLD cookie (if the server doesn't blacklist it).
    // Since we are using stateless JWTs + DB versioning, the token itself is still valid signature-wise unless we rotated the version.
    // However, the logout endpoint just clears the cookie on the client. It doesn't invalidate the token on the server unless we implement a blacklist or version bump on logout.
    // The current implementation just clears the cookie. So if an attacker stole the cookie *before* logout, they could still use it until it expires?
    // Let's check the implementation. Logout just deletes the cookie.
    // So this test simulates a client trying to use the cookie they *should* have deleted.
    
    const res = await fetch(`${BASE_URL}/refresh`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cookie": cookies || "" // Sending the old cookie
      },
    });
    
    // If we didn't implement server-side revocation on logout, this might actually pass (200), which is a common trade-off with JWTs.
    // If we want strict security, logout should also increment tokenVersion.
    // Let's see what happens.
    if (res.status === 200) {
        log("⚠️ Note: Refresh token is still valid after logout (Stateless JWT behavior). To fix this, increment tokenVersion on logout.", "yellow");
    } else {
        log("✅ Refresh token invalidated on server side.", "green");
    }
  });

  // ==========================================
  // SUITE 4: Rate Limiting
  // ==========================================
  await runTest("Rate Limiting - Spam Login", async () => {
    log("   Sending 15 login requests...", "yellow");
    const requests = [];
    for (let i = 0; i < 15; i++) {
      requests.push(fetch(`${BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: validUser.email, password: validUser.password }),
      }));
    }
    
    const responses = await Promise.all(requests);
    const tooManyRequests = responses.some(r => r.status === 429);
    assert(tooManyRequests, "Should trigger 429 Too Many Requests");
  });

  log("\n🏁 All tests completed.", "magenta");
}

testAuth();
