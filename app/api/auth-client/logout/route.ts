import { NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { cookies } from "next/headers";

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return NextResponse.json({}, { headers: corsHeaders(origin) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  const cookieStore = await cookies();
  cookieStore.delete("refreshToken");

  return NextResponse.json(
    { message: "Logged out successfully" },
    { status: 200, headers }
  );
}
