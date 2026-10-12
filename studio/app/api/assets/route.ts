import { NextResponse } from "next/server";
import { ASSET_KINDS, listAssets, saveAsset } from "@/lib/assets";
import type { Asset } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ assets: await listAssets() });
}

// Registers a file that the browser already uploaded to Blob.
export async function POST(req: Request) {
  const b = (await req.json()) as Partial<Asset>;
  if (!b.url || !b.name || !b.kind || !ASSET_KINDS.includes(b.kind)) {
    return NextResponse.json({ error: "url, name and a valid kind are required" }, { status: 400 });
  }
  if (!b.url.includes(".blob.vercel-storage.com/")) {
    return NextResponse.json({ error: "only Vercel Blob URLs can be registered" }, { status: 400 });
  }
  const asset = await saveAsset({
    url: b.url,
    name: b.name,
    kind: b.kind,
    contentType: b.contentType ?? "application/octet-stream",
    width: b.width,
    height: b.height,
    productSlug: b.productSlug,
    source: b.source ?? "upload",
    parentId: b.parentId,
  });
  return NextResponse.json({ asset });
}
