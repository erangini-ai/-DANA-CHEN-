import { NextResponse } from "next/server";
import { assertNotDana, getAsset, persistRemote, saveAsset } from "@/lib/assets";
import { brand } from "@/lib/brain";
import { runOfficial } from "@/lib/replicate";

export const maxDuration = 300;

const FORMATS = {
  "9:16": [1080, 1920],
  "4:5": [1080, 1350],
  "1:1": [1080, 1080],
  "16:9": [1920, 1080],
} as const;
type Format = keyof typeof FORMATS;

export async function POST(req: Request) {
  const { assetId, format } = (await req.json()) as { assetId: string; format: Format };
  const asset = await getAsset(assetId);
  if (!asset) return NextResponse.json({ error: "asset not found" }, { status: 404 });
  try {
    assertNotDana(asset);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 });
  }
  if (!["product", "broll"].includes(asset.kind)) {
    return NextResponse.json({ error: "הרחבה זמינה רק לתמונות מוצר ו-b-roll" }, { status: 400 });
  }
  if (!asset.width || !asset.height) return NextResponse.json({ error: "asset has no dimensions" }, { status: 400 });
  const target = FORMATS[format];
  if (!target) return NextResponse.json({ error: "format must be 9:16, 4:5, 1:1 or 16:9" }, { status: 400 });

  // Canvas mode: the original keeps its pixels and is centered; Bria generates only the margins.
  const [W, H] = target;
  const scale = Math.min(W / asset.width, H / asset.height);
  const w = Math.round(asset.width * scale);
  const h = Math.round(asset.height * scale);

  try {
    const output = await runOfficial("bria/expand-image", {
      image_url: asset.url,
      aspect_ratio: "none",
      canvas_size: [W, H],
      original_image_size: [w, h],
      original_image_location: [Math.round((W - w) / 2), Math.round((H - h) / 2)],
      prompt: brand.visual.backdrop_prompt,
      negative_prompt: brand.visual.negative_prompt,
      preserve_alpha: false,
    });
    const url = Array.isArray(output) ? String(output[0]) : String(output);
    const stored = await persistRemote(url, `expanded/${asset.productSlug ?? asset.kind}-${format.replace(":", "x")}.png`);
    const created = await saveAsset({
      url: stored.url,
      name: `${asset.name} · ${format}`,
      kind: asset.kind,
      contentType: stored.contentType,
      width: W,
      height: H,
      productSlug: asset.productSlug,
      source: "expand",
      parentId: asset.id,
    });
    return NextResponse.json({ asset: created });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
