type J = Record<string, unknown> | null;

async function post(url: string, body: unknown, token?: string): Promise<{ status: number; json: J }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), credentials: "include" });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

function toRec(u: unknown): Record<string, unknown> | null { return u && typeof u === "object" ? u as Record<string, unknown> : null; }
function s(u: unknown): string { return typeof u === "string" ? String(u) : ""; }

import readline from "readline";
function prompt(q: string): Promise<string> { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); return new Promise((resolve)=> rl.question(q, (v)=>{ rl.close(); resolve(String(v||"").trim()); })); }

async function main() {
  const base = process.env.API_BASE_URL || "http://localhost:3000";
  const rawEmail = process.env.RESET_TEST_EMAIL || "rogerduarte080@gmail.com";
  const email = rawEmail;
  const username = process.env.RESET_TEST_USERNAME || "Reset User";
  const initialPassword = process.env.RESET_TEST_PASSWORD || "Roger001*/";
  const newPassword1 = process.env.RESET_TEST_PASSWORD_NEW1 || "NewP@ssw0rd1!";
  const newPassword2 = process.env.RESET_TEST_PASSWORD_NEW2 || "NewP@ssw0rd2!";

  console.log("Reset Password test starting...\nBase:", base);

  console.log("Registering user if needed");
  const reg = await post(`${base}/api/auth-client/register`, { email, username, password: initialPassword });
  if (reg.status === 201) {
    console.log("✔ User registered");
  } else if (reg.status === 409) {
    console.log("ℹ User already exists");
  } else {
    console.log("✖ Register error:", reg.status, reg.json);
    process.exit(1);
  }

  console.log("Forgot password: request OTP");
  const reqForgot = await post(`${base}/api/auth-client/reset-password/request`, { email });
  if (reqForgot.status === 400) {
    const root = toRec(reqForgot.json);
    const msg = s(root?.error);
    if (msg.toLowerCase().includes("deactivated")) {
      console.log("✖ 'reset_password' event not active. Activate: POST /api/stmp/events { eventKey:'reset_password', active:true }");
      process.exit(1);
    }
  }
  if (reqForgot.status !== 200) {
    console.log("✖ Request OTP error:", reqForgot.status, reqForgot.json);
    process.exit(1);
  }
  const code1 = await prompt("OTP recibido (forgot): ");
  const confirmForgot = await post(`${base}/api/auth-client/reset-password/confirm`, { email, code: code1, newPassword: newPassword1 });
  if (confirmForgot.status !== 200) {
    console.log("✖ Confirm forgot error:", confirmForgot.status, confirmForgot.json);
    process.exit(1);
  }
  console.log("✔ Password reset (forgot)");

  console.log("Login con nueva contraseña 1");
  const login1 = await post(`${base}/api/auth-client/login`, { identifier: email, password: newPassword1 });
  const lr1 = toRec(login1.json);
  const token1 = s(lr1?.accessToken);
  if (!token1) { console.log("✖ Login failed", login1.status, login1.json); process.exit(1); }
  console.log("✔ Login ok");

  console.log("Autenticado: request-auth OTP");
  const reqAuth = await post(`${base}/api/auth-client/reset-password/request-auth`, {}, token1);
  if (reqAuth.status !== 200) {
    console.log("✖ Request-auth error:", reqAuth.status, reqAuth.json);
    process.exit(1);
  }
  const code2 = await prompt("OTP recibido (auth): ");
  const confirmAuth = await post(`${base}/api/auth-client/reset-password/confirm-auth`, { code: code2, newPassword: newPassword2 }, token1);
  const cr = toRec(confirmAuth.json);
  const token2 = s(cr?.accessToken);
  if (confirmAuth.status !== 200 || !token2) {
    console.log("✖ Confirm-auth error:", confirmAuth.status, confirmAuth.json);
    process.exit(1);
  }
  console.log("✔ Password reset (auth) y nuevo accessToken:", token2.slice(0, 64) + "...");

  console.log("Login con nueva contraseña 2");
  const login2 = await post(`${base}/api/auth-client/login`, { identifier: email, password: newPassword2 });
  const lr2 = toRec(login2.json);
  const token3 = s(lr2?.accessToken);
  if (!token3) { console.log("✖ Login failed 2", login2.status, login2.json); process.exit(1); }
  console.log("✔ Login ok final");
}

main().catch((e)=>{ console.error(e); process.exit(1); });

