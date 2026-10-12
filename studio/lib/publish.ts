import { getAsset } from "./assets.ts";
import { brand, getProduct } from "./brain.ts";
import { auditCreative, gateProduct } from "./compliance.ts";
import { auditKind, publicText, type LabPackage } from "./lab.ts";
import { KEYS, hAll, hGet, hPut } from "./store.ts";
import type { ContentPiece, ScheduleItem } from "./types.ts";

// Every publish re-runs the gate and the audit: rules or products.json may have changed since scheduling.
export async function preflight(piece: ContentPiece): Promise<string[]> {
  const problems: string[] = [];
  if (piece.verdict !== "GO") problems.push(`הפריט בסטטוס ${piece.verdict}, רק GO מתפרסם.`);
  const product = await getProduct(piece.productSlug);
  if (!product) problems.push("המוצר כבר לא קיים ב-products.json.");
  else {
    const gate = gateProduct(product);
    problems.push(...gate.reasons);
    const pkg: LabPackage = {
      headline: piece.final.headline,
      caption_he: piece.final.caption_he,
      hashtags: piece.final.hashtags,
      script: (piece.final.script ?? {}) as LabPackage["script"],
      visual: (piece.final.visual ?? {}) as Record<string, unknown>,
    };
    const audit = auditCreative(publicText(pkg), { kind: auditKind(piece.platform), productSlug: product.slug, productName: product.name });
    problems.push(...audit.findings.filter((f) => f.severity === "BLOCK").map((f) => `${f.label_he}: ${f.match ?? ""}`));
  }
  if (!piece.mediaAssetId) problems.push("אין מדיה מצורפת לפריט.");
  return problems;
}

export async function publishItem(item: ScheduleItem): Promise<ScheduleItem> {
  const piece = await hGet<ContentPiece>(KEYS.pieces, item.pieceId);
  const update = async (patch: Partial<ScheduleItem>) => {
    const next = { ...item, ...patch };
    await hPut(KEYS.schedule, item.id, next);
    return next;
  };
  if (!piece) return update({ status: "failed", lastError: "הפריט נמחק." });

  const problems = await preflight(piece);
  if (problems.length) return update({ status: "blocked", lastError: problems.join(" | ") });

  const webhook = process.env.MAKE_WEBHOOK_URL;
  if (!webhook) return update({ status: "failed", lastError: "MAKE_WEBHOOK_URL לא מוגדר." });

  const media = await getAsset(piece.mediaAssetId!);
  const caption = `${piece.final.caption_he}\n\n${piece.final.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`;
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      schedule_id: item.id,
      piece_id: piece.id,
      platform: item.platform,
      product: piece.productSlug,
      headline: piece.final.headline,
      caption,
      media_url: media?.url,
      media_type: media?.contentType,
      whatsapp_url: brand.whatsapp_url,
      publish_at: item.publishAt,
    }),
  }).catch((e: Error) => e);
  if (res instanceof Error) return update({ status: "failed", lastError: res.message });
  if (!res.ok) return update({ status: "failed", lastError: `Make ${res.status}: ${(await res.text()).slice(0, 200)}` });
  return update({ status: "sent", sentAt: new Date().toISOString(), lastError: undefined });
}

export async function publishDue(now = new Date()): Promise<ScheduleItem[]> {
  const due = (await hAll<ScheduleItem & { createdAt?: string }>(KEYS.schedule)).filter(
    (i) => i.status === "scheduled" && new Date(i.publishAt) <= now,
  );
  const out: ScheduleItem[] = [];
  for (const item of due) out.push(await publishItem(item));
  return out;
}
