export function corsHeaders(origin: string | null) {
  const isCorsEnabled = process.env.CORS === "true";
  const allowedOrigin = process.env.CORS_AUTH_CLIENT || "";

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };

  if (!isCorsEnabled) {
    // If CORS is disabled (false), we allow all origins (by reflecting the request origin)
    // This effectively disables CORS restrictions while still supporting credentials
    headers["Access-Control-Allow-Origin"] = origin || "*";
  } else {
    // If CORS is enabled (true), restrict to CORS_AUTH_CLIENT
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
  }

  return headers;
}
