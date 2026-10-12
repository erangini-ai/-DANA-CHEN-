import { NextResponse } from "next/server";
import { brand, getProduct } from "@/lib/brain";
import { auditCreative, gateProduct, verdictFor } from "@/lib/compliance";
import { auditKind, publicText, type LabPackage } from "@/lib/lab";
import { KEYS, hAll, hDel, hGet, hPut, newId } from "@/lib/store";
import { getAsset } from "@/lib/assets";
import type { ContentPiece, Finding, LabStageOutput, Platform } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ pieces: await hAll<ContentPiece>(KEYS.pieces), brand });
}

interface SaveBody {
  productSlug: string;
  platform: Platform;
  goal: string;
  pkg: LabPackage;
  stages: Record<string, LabStageOutput>;
  loops: number;
  confidence: number;
  officerIssues: { field: string; quote: string; problem: string; fix: string; severity: "BLOCK" | "WARN" }[];
}

export async function POST(req: Request) {
  const b = (await req.json()) as SaveBody;
  const product = await getProduct(b.productSlug);
  if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });
  const gate = gateProduct(product);
  if (!gate.allowed) return NextResponse.json({ error: "blocked", reasons: gate.reasons }, { status: 403 });

  // Never trust the client's audit: re-run it on the final public text.
  const audit = auditCreative(publicText(b.pkg), { kind: auditKind(b.platform), productSlug: product.slug, productName: product.name });
  const officer: Finding[] = (b.officerIssues ?? []).map((i) => ({
    rule: "compliance_officer",
    severity: i.severity === "BLOCK" ? "BLOCK" : "WARN",
    label_he: i.problem,
    match: i.quote,
    field: i.field,
    fix_he: i.fix,
  }));
  const findings = [...audit.findings, ...officer];
  const confidence = Math.min(1, Math.max(0, Number(b.confidence) || 0));
  const verdict = verdictFor(findings, confidence);

  const piece: ContentPiece = {
    id: newId("pc"),
    productSlug: product.slug,
    platform: b.platform,
    goal: b.goal,
    stages: b.stages,
    final: {
      headline: b.pkg.headline,
      caption_he: b.pkg.caption_he,
      hashtags: b.pkg.hashtags,
      script: b.pkg.script,
      visual: b.pkg.visual,
    },
    loops: b.loops,
    confidence,
    audit: { verdict, findings },
    verdict,
    createdAt: new Date().toISOString(),
  };
  await hPut(KEYS.pieces, piece.id, piece);
  return NextResponse.json({ piece });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await hDel(KEYS.pieces, id);
  return NextResponse.json({ ok: true });
}

// Attach a finished media asset (reel MP4 / feed image) to a piece.
export async function PATCH(req: Request) {
  const { id, mediaAssetId } = (await req.json()) as { id: string; mediaAssetId: string };
  const piece = await hGet<ContentPiece>(KEYS.pieces, id);
  const asset = await getAsset(mediaAssetId);
  if (!piece || !asset) return NextResponse.json({ error: "piece or asset not found" }, { status: 404 });
  piece.mediaAssetId = asset.id;
  await hPut(KEYS.pieces, piece.id, piece);
  return NextResponse.json({ piece });
}
