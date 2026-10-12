import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, authToken } from "./lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Vercel Cron authenticates with CRON_SECRET inside the route itself.
  if (pathname.startsWith("/api/cron/") || pathname === "/login" || pathname === "/api/login") {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (cookie && cookie === (await authToken())) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|ffmpeg/|favicon.ico|icon.svg).*)"],
};
