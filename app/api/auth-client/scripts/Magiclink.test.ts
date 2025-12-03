type JsonLike = Record<string, unknown> | null;

async function post(url: string, body: unknown): Promise<{ status: number; json: JsonLike }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "include" });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function get(url: string): Promise<{ status: number; json: JsonLike }> {
  const res = await fetch(url, { method: "GET", headers: { "Accept": "application/json" }, credentials: "include" });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

function toRecord(u: unknown): Record<string, unknown> | null {
  if (u && typeof u === "object") return u as Record<string, unknown>;
  return null;
}

function isString(u: unknown): u is string { return typeof u === "string"; }

async function main() {
  const base = process.env.API_BASE_URL || "http://localhost:3000";
  const rawEmail = process.env.MAGIC_TEST_EMAIL || "magic.user@examplecom";
  const email = /.+@.+\..+/.test(rawEmail) ? rawEmail : "magic.user@example.com";
  const username = process.env.MAGIC_TEST_USERNAME || "Magic User";
  const password = process.env.MAGIC_TEST_PASSWORD || "MagicP@ssw0rd!";

  console.log("Magic Link test starting...\nBase:", base);

  console.log("Registering user if needed");
  const reg = await post(`${base}/api/auth-client/register`, { email, username, password });
  if (reg.status === 201) {
    console.log("✔ User registered");
  } else if (reg.status === 409) {
    console.log("ℹ User already exists");
  } else {
    console.log("✖ Register error:", reg.status, reg.json);
    process.exit(1);
  }

  console.log("Requesting magic link");
  const send = await post(`${base}/api/auth-client/magic-link/send`, { email });
  if (send.status === 400) {
    const root = toRecord(send.json);
    const msg = root && isString(root["error"]) ? String(root["error"]) : "";
    if (msg.toLowerCase().includes("event not active")) {
      console.log("✖ 'magic_link' event not active. Activate with: POST /api/stmp/events { eventKey:'magic_link', active:true }");
      process.exit(1);
    }
  }
  if (send.status !== 200) {
    console.log("✖ Magic link send error:", send.status, send.json);
    process.exit(1);
  }
  const sendRoot = toRecord(send.json);
  const token = sendRoot && isString(sendRoot["token"]) ? String(sendRoot["token"]) : "";
  if (!token) {
    console.log("✖ No token returned from send endpoint");
    process.exit(1);
  }
  console.log("✔ Magic token generated:", token.slice(0, 16) + "...");

  console.log("Consuming magic link via GET");
  const consumeGet = await get(`${base}/api/auth-client/magic-link/consume?token=${encodeURIComponent(token)}`);
  if (consumeGet.status !== 200) {
    console.log("✖ Consume GET error:", consumeGet.status, consumeGet.json);
    process.exit(1);
  }
  const cRoot = toRecord(consumeGet.json);
  const accessGet = cRoot && isString(cRoot["accessToken"]) ? String(cRoot["accessToken"]) : "";
  if (!accessGet) {
    console.log("✖ No accessToken from consume GET:", consumeGet.json);
    process.exit(1);
  }
  console.log("✔ Access token (GET):", accessGet.slice(0, 64) + "...");

  console.log("Consuming magic link again (should fail)");
  const consumeAgain = await get(`${base}/api/auth-client/magic-link/consume?token=${encodeURIComponent(token)}`);
  if (consumeAgain.status === 409) {
    console.log("✔ Token already used as expected");
  } else {
    console.log("ℹ Unexpected status consuming again:", consumeAgain.status, consumeAgain.json);
  }

  console.log("Magic Link test completed successfully");
}

main().catch((e) => { console.error(e); process.exit(1); });

