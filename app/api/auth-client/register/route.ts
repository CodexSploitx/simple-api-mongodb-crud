import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { RegisterSchema } from "@/lib/validations";
import { hashPassword, generateAccessToken, generateRefreshToken } from "@/lib/auth";
import { corsHeaders, isCorsEnabled, getAllowedCorsOrigins, originAllowed } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rate-limit";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { getStmpEnv } from "@/lib/stmp";

const DB_NAME = process.env.AUTH_CLIENT_DB || "authclient";
const COLLECTION_NAME = process.env.AUTH_CLIENT_COLLECTION || "users";

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  const enabled = await isCorsEnabled();
  const allowed = await getAllowedCorsOrigins();
  return NextResponse.json({}, { headers: corsHeaders(origin, enabled, allowed) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const enabled = await isCorsEnabled();
  const allowed = await getAllowedCorsOrigins();
  const headers = corsHeaders(origin, enabled, allowed);
  if (enabled && !originAllowed(origin, allowed)) {
    return NextResponse.json({ error: "Blocked by CORS: Origin not allowed" }, { status: 403, headers });
  }

  try {
    // Rate Limit
    const ipHeader = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
    const ip = String(ipHeader).split(",").map((s)=>s.trim()).filter(Boolean)[0] || "unknown";
    checkRateLimit(ip, 5, 60000); // 5 requests per minute

    const body = await request.json();
    
    // Validation
    const result = RegisterSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation error", details: result.error.flatten() },
        { status: 400, headers }
      );
    }

    const { email, username, password } = result.data;
    const userAgent = String(request.headers.get("user-agent") || "").slice(0, 512);
    const acceptLanguage = String(request.headers.get("accept-language") || "").slice(0, 128);
    const hdrCountry = String(request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || request.headers.get("x-geo-country") || "").slice(0, 64);
    const parseDevice = (ua: string) => {
      const lower = ua.toLowerCase();
      const isMobile = /mobile|android|iphone|ipad|ipod/.test(lower);
      const isTablet = /ipad|tablet/.test(lower);
      const type = isMobile ? (isTablet ? "tablet" : "mobile") : /bot|crawler|spider/.test(lower) ? "bot" : "desktop";
      const os = /windows/.test(lower) ? "Windows" : /mac os|macintosh/.test(lower) ? "macOS" : /android/.test(lower) ? "Android" : /ios|iphone|ipad|ipod/.test(lower) ? "iOS" : /linux/.test(lower) ? "Linux" : "unknown";
      const browser = /edg\//.test(lower) ? "Edge" : /chrome\//.test(lower) && !/edg\//.test(lower) ? "Chrome" : /safari\//.test(lower) && !/chrome\//.test(lower) ? "Safari" : /firefox\//.test(lower) ? "Firefox" : /opera|opr\//.test(lower) ? "Opera" : "unknown";
      const versionMatch = ua.match(/(chrome|firefox|safari|edg|opr)\/([\d.]+)/i);
      const version = versionMatch ? versionMatch[2] : "";
      return { type, os, browser, version };
    };
    const device = parseDevice(userAgent);
    const language = acceptLanguage.split(",")[0]?.trim() || "";
    let geo: Record<string, unknown> = {};
    if (process.env.ENABLE_GEO_LOOKUP === "true" && ip !== "unknown") {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 2000);
        const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, { signal: ctrl.signal });
        clearTimeout(t);
        if (res.ok) {
          const j = await res.json().catch(() => null);
          if (j && typeof j === "object") {
            geo = {
              country: String(j.country_name || hdrCountry || ""),
              region: String(j.region || j.region_code || ""),
              city: String(j.city || ""),
              latitude: typeof j.latitude === "number" ? j.latitude : Number(j.latitude || 0),
              longitude: typeof j.longitude === "number" ? j.longitude : Number(j.longitude || 0),
              isp: String(j.org || j.org_name || ""),
              asn: j.asn || j.asn_number || undefined,
            };
          }
        }
      } catch {}
    }

    const collection = await getCollection(DB_NAME, COLLECTION_NAME);

    // Check if user exists
    const existingUser = await collection.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409, headers }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);
    const tokenVersion = 0;
    const { db: stmpDb, collection: stmpConfig } = getStmpEnv();
    const cfgCol = await getCollection(stmpDb, stmpConfig);
    const cfgDoc = await cfgCol.findOne({ key: "default" });
    const requireVerify = Boolean(cfgDoc?.requireEmailVerificationLogin);

    // Create user
    const newUser = {
      email,
      username,
      password: hashedPassword,
      tokenVersion,
      verifiEmail: requireVerify ? false : true,
      createdAt: new Date(),
      updatedAt: new Date(),
      registrationMeta: {
        ip: { address: ip, source: ipHeader ? "x-forwarded-for" : "unknown", country: String(geo?.country || hdrCountry || "").trim() || undefined, region: String((geo as Record<string, unknown>)?.region || "").trim() || undefined, city: String((geo as Record<string, unknown>)?.city || "").trim() || undefined, latitude: (geo as Record<string, unknown>)?.latitude as number | undefined, longitude: (geo as Record<string, unknown>)?.longitude as number | undefined, isp: String((geo as Record<string, unknown>)?.isp || "").trim() || undefined, asn: (geo as Record<string, unknown>)?.asn as string | number | undefined },
        userAgent,
        device,
        locale: { language, raw: acceptLanguage },
        demographics: {},
        timestamp: new Date(),
      },
    };

    const insertResult = await collection.insertOne(newUser);
    const userId = insertResult.insertedId.toString();

    // Generate tokens
    const accessToken = generateAccessToken({ userId, email, username, version: tokenVersion });
    const refreshToken = generateRefreshToken({ userId, version: tokenVersion });

    // Set Refresh Token Cookie
    const cookieStore = await cookies();
    cookieStore.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    try {
      const { db, collection: stmpConfig, templates: stmpTemplates } = getStmpEnv();
      const cfgCol = await getCollection(db, stmpConfig);
      const cfg = await cfgCol.findOne({ key: "default" });
      const events = (cfg && cfg.events) || {};
      if (events["confirm_sign_up"]) {
        const tplCol = await getCollection(db, stmpTemplates);
        const activeTemplate = await tplCol.findOne({ eventKey: "confirm_sign_up", active: true });
        if (activeTemplate) {
          const siteUrl = process.env.API_BASE_URL || "";
          let code = "";
          if (String(activeTemplate.body || "").includes("{{ .CodeConfirmation }}")) {
            const otpColName = process.env.STMP_OTP || "otp";
            const otpCol = await getCollection(db, otpColName);
            code = String(Math.floor(100000 + Math.random() * 900000));
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
            const maxAttempts = Number(cfg?.otpMaxAttempts || 5);
            await otpCol.insertOne({ userId: new ObjectId(userId), code, eventKey: "confirm_sign_up", used: false, attempts: 0, maxAttempts, createdAt: new Date(), expiresAt });
          }
          const replace = (s: string): string => {
            let out = s;
            out = out.replaceAll("{{ .EmailUSer }}", String(email));
            out = out.replaceAll("{{ .UserName }}", String(username));
            out = out.replaceAll("{{ ._id }}", String(userId));
            out = out.replaceAll("{{ .SiteURL }}", siteUrl);
            if (code) out = out.replaceAll("{{ .CodeConfirmation }}", code);
            return out;
          };
          const subject = replace(String(activeTemplate.subject || ""));
          const html = String(activeTemplate.body || "");
          const sanitize = (h: string) => {
            let out = h;
            out = out.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
            out = out.replace(/on[a-z]+\s*=\s*"[^"]*"/gi, "");
            out = out.replace(/on[a-z]+\s*=\s*'[^']*'/gi, "");
            out = out.replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#" ');
            out = out.replace(/href\s*=\s*'javascript:[^']*'/gi, "href='#' ");
            return out;
          };
          const outboxColName = process.env.STMP_OUTBOX || "outbox";
          const outboxCol = await getCollection(db, outboxColName);
          const outboxDoc = {
            eventKey: "confirm_sign_up",
            userId: new ObjectId(userId),
            to: String(email),
            subject,
            html: sanitize(replace(html)),
            queuedAt: new Date(),
            status: "queued",
          };
          await outboxCol.insertOne(outboxDoc);
          try {
            const { sendMail, ensureReadableEmailHtml } = await import("@/lib/mailer");
            const ok = await sendMail(outboxDoc.to, outboxDoc.subject, ensureReadableEmailHtml(outboxDoc.html));
            if (ok) {
              await outboxCol.updateOne({ userId: new ObjectId(userId), eventKey: "confirm_sign_up", queuedAt: outboxDoc.queuedAt }, { $set: { status: "sent", sentAt: new Date() } });
            }
          } catch {}
        }
      }
    } catch {}

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: { id: userId, email, username },
        accessToken,
      },
      { status: 201, headers }
    );
  } catch (error: unknown) {
    console.error("Register error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage === "Too many requests, please try again later." ? 429 : 500, headers }
    );
  }
}
