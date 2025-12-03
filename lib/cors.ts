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

export function corsHeaders(origin: string | null, enabled: boolean) {
  const allowed = (process.env.CORS_AUTH_CLIENT || "").split(",").map((s) => s.trim()).filter(Boolean);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };

  if (!enabled) {
    if (origin) headers["Access-Control-Allow-Origin"] = origin;
  } else {
    if (origin && (allowed.length === 0 || allowed.includes(origin))) {
      headers["Access-Control-Allow-Origin"] = origin;
    }
  }

  return headers;
}
