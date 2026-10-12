import { NextResponse } from "next/server";
import { preflight } from "@/lib/publish";
import { KEYS, hAll, hDel, hGet, hPut, newId } from "@/lib/store";
import type { ContentPiece, Platform, ScheduleItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await hAll<ScheduleItem & { createdAt?: string }>(KEYS.schedule);
  items.sort((a, b) => a.publishAt.localeCompare(b.publishAt));
  return NextResponse.json({ items, makeConfigured: Boolean(process.env.MAKE_WEBHOOK_URL) });
}

export async function POST(req: Request) {
  const { pieceId, platform, publishAt } = (await req.json()) as { pieceId: string; platform?: Platform; publishAt: string };
  const piece = await hGet<ContentPiece>(KEYS.pieces, pieceId);
  if (!piece) return NextResponse.json({ error: "piece not found" }, { status: 404 });
  if (Number.isNaN(Date.parse(publishAt))) return NextResponse.json({ error: "publishAt must be ISO date" }, { status: 400 });
  const problems = await preflight(piece);
  if (problems.length) return NextResponse.json({ error: "blocked", reasons: problems }, { status: 422 });
  const item: ScheduleItem & { createdAt: string } = {
    id: newId("sc"),
    pieceId,
    platform: platform ?? piece.platform,
    publishAt: new Date(publishAt).toISOString(),
    status: "scheduled",
    createdAt: new Date().toISOString(),
  };
  await hPut(KEYS.schedule, item.id, item);
  return NextResponse.json({ item });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await hDel(KEYS.schedule, id);
  return NextResponse.json({ ok: true });
}
