import { NextResponse } from "next/server";
import { corsHeaders, isCorsEnabled } from "@/lib/cors";
import { cookies } from "next/headers";

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  const enabled = await isCorsEnabled();
  return NextResponse.json({}, { headers: corsHeaders(origin, enabled) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const enabled = await isCorsEnabled();
  const headers = corsHeaders(origin, enabled);

  const cookieStore = await cookies();
  cookieStore.delete("refreshToken");

  return NextResponse.json(
    { message: "Logged out successfully" },
    { status: 200, headers }
  );
}
