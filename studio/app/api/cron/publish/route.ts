import { NextResponse } from "next/server";
import { publishDue } from "@/lib/publish";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Vercel Cron sends: Authorization: Bearer ${CRON_SECRET}
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const results = await publishDue();
  return NextResponse.json({ processed: results.length, results });
}
