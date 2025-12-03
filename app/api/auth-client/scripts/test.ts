import readline from "readline";

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => rl.question(question, (v) => resolve(v)));
  rl.close();
  return String(answer || "").trim();
}

async function post(url: string, body: unknown): Promise<{ status: number; json: unknown }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "include" });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function get(url: string): Promise<{ status: number; json: unknown }> {
  const res = await fetch(url, { method: "GET" });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function toRecord(u: unknown): Record<string, unknown> | null {
  if (u && typeof u === "object") return u as Record<string, unknown>;
  return null;
}

function toArray(u: unknown): unknown[] {
  return Array.isArray(u) ? u : [];
}

function isUserDoc(u: unknown): u is { _id?: string; email?: string } {
  if (!u || typeof u !== "object") return false;
  const o = u as Record<string, unknown>;
  return typeof o.email === "string" || typeof o._id === "string";
}

async function findUserIdByEmail(base: string, email: string): Promise<string | null> {
  const u = `${base}/api/authclient/users?searchField=email&searchValue=${encodeURIComponent(email)}`;
  const r = await get(u);
  if (r.status !== 200) return null;
  const root = toRecord(r.json);
  const docs = toArray(root?.documents ?? root?.data);
  const candidates = docs.filter(isUserDoc) as Array<{ _id?: string; email?: string }>;
  const doc = candidates.find((d) => d.email === email) ?? candidates[0];
  return doc && doc._id ? String(doc._id) : null;
}

async function main() {
  const base = process.env.API_BASE_URL || "http://localhost:3000";
  const rawEmail = process.env.TEST_EMAIL || "rogerduarte080@gmailcom";
  const email = /.+@.+\..+/.test(rawEmail) ? rawEmail : "rogerduarte080@gmail.com";
  const username = "ROG";
  const password = process.env.TEST_PASSWORD || "Roger001*/";

  console.log("Registro de usuario");
  let userId: string | null = null;
  const reg = await post(`${base}/api/auth-client/register`, { email, username, password });
  if (reg.status === 201) {
    const root = toRecord(reg.json);
    const userObj = root && toRecord(root["user"]);
    const uid = userObj && typeof userObj["id"] === "string" ? String(userObj["id"]) : "";
    userId = uid;
    console.log("✔ Usuario registrado:", userId);
  } else if (reg.status === 409) {
    console.log("Usuario ya existe, buscando userId");
    userId = await findUserIdByEmail(base, email);
    if (!userId) {
      console.log("No se pudo obtener el userId");
      process.exit(1);
    }
  } else {
    console.log("Error en registro:", reg.status, reg.json);
    process.exit(1);
  }

  console.log("Intento de login antes de verificación");
  const preLogin = await post(`${base}/api/auth-client/login`, { identifier: email, password });
  {
    const preRoot = toRecord(preLogin.json);
    const errMsg = preRoot && typeof preRoot["error"] === "string" ? String(preRoot["error"]) : "";
    if (preLogin.status === 403 && errMsg.toLowerCase().includes("no verificado")) {
      console.log("✔ Login bloqueado por email no verificado");
    } else if (preLogin.status === 200) {
      console.log("Advertencia: el login fue exitoso sin verificación, configuración deshabilitada");
    } else {
      console.log("Respuesta de login:", preLogin.status, preLogin.json);
    }
  }

  const code = await prompt("Introduce el código OTP recibido por email: ");
  console.log("Verificando OTP");
  const ver = await post(`${base}/api/stmp/otp/verify`, { userId, code });
  {
    const vRoot = toRecord(ver.json);
    const ok = vRoot && vRoot["success"] === true;
    if (ver.status !== 200 || !ok) {
      console.log("Error verificando OTP:", ver.status, ver.json);
      process.exit(1);
    }
  }
  console.log("✔ Email verificado");

  console.log("Intento de login después de verificación");
  const postLogin = await post(`${base}/api/auth-client/login`, { identifier: email, password });
  {
    const postRoot = toRecord(postLogin.json);
    const token = postRoot && typeof postRoot["accessToken"] === "string" ? String(postRoot["accessToken"]) : "";
    if (postLogin.status === 200 && token) {
      console.log("✔ Login exitoso");
      console.log("Token:", token.slice(0, 64) + "...");
    } else {
      console.log("Login no exitoso:", postLogin.status, postLogin.json);
      process.exit(1);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

