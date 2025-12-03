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
  const rawEmail = "rogerduarte080@gmail.com";
  const email = rawEmail;
  const username = "Change User";
  const password = "Roger001*/";
  const newEmailRaw = "codexsploitx@gmail.com";
  const newEmail = newEmailRaw;

  const reg = await post(`${base}/api/auth-client/register`, { email, username, password });
  if (reg.status !== 201 && reg.status !== 409) { console.log("Register error", reg.status, reg.json); process.exit(1); }

  const login = await post(`${base}/api/auth-client/login`, { identifier: email, password });
  const lr = toRec(login.json);
  const token = s(lr?.accessToken);
  if (!token) { console.log("Login failed", login.status, login.json); process.exit(1); }

  const start = await post(`${base}/api/auth-client/change-email/start`, { currentEmail: email, password }, token);
  if (start.status !== 200) { console.log("Start error", start.status, start.json); process.exit(1); }

  const codeCurrent = await prompt("OTP enviado al email actual: ");
  const verifyCurrent = await post(`${base}/api/auth-client/change-email/verify-current`, { code: codeCurrent }, token);
  if (verifyCurrent.status !== 200) { console.log("Verify current error", verifyCurrent.status, verifyCurrent.json); process.exit(1); }

  const reqNew = await post(`${base}/api/auth-client/change-email/request-new`, { newEmail }, token);
  if (reqNew.status !== 200) { console.log("Request new error", reqNew.status, reqNew.json); process.exit(1); }

  const codeNew = await prompt("OTP enviado al nuevo email: ");
  const confirmNew = await post(`${base}/api/auth-client/change-email/confirm-new`, { code: codeNew }, token);
  const cr = toRec(confirmNew.json);
  const newToken = s(cr?.accessToken);
  if (confirmNew.status !== 200 || !newToken) { console.log("Confirm new error", confirmNew.status, confirmNew.json); process.exit(1); }
  console.log("✔ Email cambiado y nuevo accessToken:", newToken.slice(0, 64) + "...");
}

main().catch((e)=>{ console.error(e); process.exit(1); });
