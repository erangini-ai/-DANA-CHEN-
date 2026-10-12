import { NextResponse } from "next/server";
import { AGENTS, PLATFORM_HE, type LabStage } from "@/lib/agents";
import { brainContext, getProduct } from "@/lib/brain";
import { askJSON } from "@/lib/claude";
import { gateProduct } from "@/lib/compliance";
import type { Platform } from "@/lib/types";

export const maxDuration = 120;

interface StepBody {
  stage: LabStage;
  productSlug: string;
  platform: Platform;
  goal: string;
  previous?: Record<string, unknown>;
  package?: unknown;
  audit?: unknown;
  review?: unknown;
}

export async function POST(req: Request) {
  const b = (await req.json()) as StepBody;
  const agent = AGENTS[b.stage];
  if (!agent) return NextResponse.json({ error: `unknown stage ${b.stage}` }, { status: 400 });

  const product = await getProduct(b.productSlug);
  if (!product) return NextResponse.json({ error: "product not found in imported products.json" }, { status: 404 });
  const gate = gateProduct(product);
  if (!gate.allowed) return NextResponse.json({ error: "blocked", reasons: gate.reasons }, { status: 403 });

  const user = JSON.stringify(
    {
      brief: { platform: PLATFORM_HE[b.platform] ?? b.platform, goal: b.goal },
      product: product.raw,
      spf_note_required: gate.spfRequired,
      brain: JSON.parse(await brainContext()),
      previous_stages: b.previous ?? {},
      package: b.package ?? null,
      automated_audit: b.audit ?? null,
      review: b.review ?? null,
    },
    null,
    1,
  );

  try {
    const { data } = await askJSON<Record<string, unknown>>({ system: agent.system, user, maxTokens: 4000 });
    const c = Number(data.confidence);
    const confidence = Number.isFinite(c) ? Math.min(1, Math.max(0, c)) : 0.5;
    return NextResponse.json({ stage: b.stage, agent: agent.name_he, data, confidence });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
