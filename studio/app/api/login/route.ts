import { NextResponse } from "next/server";
import { AUTH_COOKIE, authToken } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = (await req.json()) as { password?: string };
  if (!password || password !== process.env.STUDIO_PASSWORD) {
    return NextResponse.json({ error: "סיסמה שגויה" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await authToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return res;
}
