import readline from "readline";

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => rl.question(question, (v) => resolve(v)));
  rl.close();
  return String(answer || "").trim();
}

async function post(url: string, body: unknown): Promise<{ status: number; json: unknown }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function toRecord(u: unknown): Record<string, unknown> | null {
  if (u && typeof u === "object") return u as Record<string, unknown>;
  return null;
}

async function main() {
  const base = process.env.API_BASE_URL || "http://localhost:3000";
  console.log(`Base URL: ${base}`);
  const raw = await prompt("¿Cuántos usuarios de prueba quieres crear? ");
  const n = Math.max(0, parseInt(raw || "0", 10) || 0);
  if (n <= 0) {
    console.log("Cantidad inválida");
    process.exit(1);
  }

  const prefix = (await prompt("Prefijo de username (default: testuser): ")) || "testuser";
  const ts = Date.now();
  const password = "Test123!";

  const created: Array<{ email: string; id?: string }> = [];
  for (let i = 1; i <= n; i++) {
    const email = `${prefix}-${ts}-${i}@test.com`;
    const username = `${prefix}${i}`;
    const r = await post(`${base}/api/auth-client/register`, { email, username, password });
    if (r.status === 201) {
      const root = toRecord(r.json);
      const userObj = root && toRecord(root["user"]);
      const id = userObj && typeof userObj["id"] === "string" ? String(userObj["id"]) : undefined;
      created.push({ email, id });
      console.log(`✔ Creado: ${email}  id=${id || "?"}`);
    } else if (r.status === 409) {
      console.log(`✖ Ya existía: ${email} (409)`);
    } else {
      console.log(`✖ Error creando ${email}: ${r.status}`);
    }
  }

  console.log("\nResumen:");
  console.log(`Intentados: ${n}, creados: ${created.length}`);
  for (const c of created) {
    console.log(`- ${c.email}  id=${c.id || "?"}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

