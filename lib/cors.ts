import { getCollection } from "./mongo";

export async function isCorsEnabled(): Promise<boolean> {
  try {
    const dbName = process.env.AUTH_CLIENT_DB || "authclient";
    const colName = process.env.AUTH_CLIENT_SETTINGS || "settings";
    const col = await getCollection(dbName, colName);
    const cfg = await col.findOne({ key: "access_mode" });
    return Boolean(cfg?.cors_enabled === true);
  } catch {
    return String(process.env.CORS || "false").toLowerCase() === "true";
  }
}

export async function getAllowedCorsOrigins(): Promise<string[]> {
  try {
    const dbName = process.env.AUTH_CLIENT_DB || "authclient";
    const colName = process.env.AUTH_CLIENT_SETTINGS || "settings";
    const col = await getCollection(dbName, colName);
    const cfg = await col.findOne({ key: "access_mode" });
    const arr = cfg?.cors_allowed_origins;
    if (Array.isArray(arr)) return arr.map((s: unknown) => String(s)).filter(Boolean);
  } catch {}
  const envVal = process.env.CORS_AUTH_CLIENT || "";
  return envVal.split(",").map((s) => s.trim()).filter(Boolean);
}

export function normalizeOrigin(s: string): string {
  try {
    const u = new URL(s);
    return u.origin.toLowerCase();
  } catch {
    return String(s).replace(/\/+$/, "").toLowerCase();
  }
}

export function originAllowed(origin: string | null, allowed: string[]): boolean {
  if (!origin) return true; // same-origin or non-browser clients; do not enforce here
  const o = normalizeOrigin(origin);
  const set = new Set(allowed.map((a) => normalizeOrigin(a)));
  if (set.size === 0 || set.has(o)) return true;
  // Fallback: allow by host regardless of protocol (http/https)
  const hostOf = (s: string): string => {
    try { return new URL(s).host.toLowerCase(); } catch { return s.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase(); }
  };
  const host = hostOf(o);
  const allowedHosts = new Set(Array.from(set).map(hostOf));
  return allowedHosts.has(host);
}

export function corsHeaders(origin: string | null, enabled: boolean, allowed: string[]) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };

  if (!enabled) {
    if (origin) headers["Access-Control-Allow-Origin"] = origin;
  } else {
    if (origin && originAllowed(origin, allowed)) {
      headers["Access-Control-Allow-Origin"] = origin;
    }
  }

  return headers;
}
