import { NextResponse } from "next/server";
import { publishItem } from "@/lib/publish";
import { KEYS, hGet } from "@/lib/store";
import type { ScheduleItem } from "@/lib/types";

export async function POST(req: Request) {
  const { id } = (await req.json()) as { id: string };
  const item = await hGet<ScheduleItem>(KEYS.schedule, id);
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ item: await publishItem(item) });
}
