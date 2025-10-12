import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json(
    { success: true, message: "Logged out" },
    { status: 200 }
  );
  // Clear the auth_token cookie by setting maxAge to 0
  res.cookies.set("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed",
      message: "Use POST /api/auth/logout to end the session",
    },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed",
      message: "Use POST /api/auth/logout to end the session",
    },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed",
      message: "Use POST /api/auth/logout to end the session",
    },
    { status: 405 }
  );
}