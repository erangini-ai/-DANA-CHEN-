import { NextResponse } from "next/server";
import { AGENTS } from "@/lib/agents";
import { brand } from "@/lib/brain";
import { askJSON, MODEL } from "@/lib/claude";
import Anthropic from "@anthropic-ai/sdk";
import { KEYS, history, pushHistory } from "@/lib/store";

export const maxDuration = 300;

interface ExtraProvider {
  name: string;
  baseUrl: string; // e.g. https://api.openai.com/v1 — must expose POST /chat/completions
  apiKeyEnv: string;
  model: string;
}

function extraProviders(): ExtraProvider[] {
  try {
    const list = JSON.parse(process.env.MONITOR_PROVIDERS || "[]") as ExtraProvider[];
    return list.filter((p) => p.name && p.baseUrl && p.model && process.env[p.apiKeyEnv]);
  } catch {
    return [];
  }
}

const mention = new RegExp(brand.mention_pattern, "i");

async function askClaude(q: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    messages: [{ role: "user", content: q }],
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
  });
  return res.content.filter((b): b is Anthropic.Messages.TextBlock => b.type === "text").map((b) => b.text).join("");
}

async function askOpenAICompatible(p: ExtraProvider, q: string): Promise<string> {
  const res = await fetch(`${p.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env[p.apiKeyEnv]}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: p.model, messages: [{ role: "user", content: q }] }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`${p.name} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content ?? "";
}

export async function GET() {
  return NextResponse.json({ runs: await history(KEYS.monitor, 20), providers: ["claude", ...extraProviders().map((p) => p.name)] });
}

export async function POST() {
  const providers: { name: string; ask: (q: string) => Promise<string> }[] = [
    { name: "claude", ask: askClaude },
    ...extraProviders().map((p) => ({ name: p.name, ask: (q: string) => askOpenAICompatible(p, q) })),
  ];

  const jobs = brand.monitor_queries.flatMap((query) =>
    providers.map(async (p) => {
      try {
        const answer = await p.ask(query);
        return { provider: p.name, query, mentioned: mention.test(answer), excerpt: answer.slice(0, 600) };
      } catch (e) {
        return { provider: p.name, query, mentioned: false, excerpt: "", error: (e as Error).message };
      }
    }),
  );
  const results = await Promise.all(jobs);
  const ok = results.filter((r) => !("error" in r) || !r.error);
  const visibility = ok.length ? ok.filter((r) => r.mentioned).length / ok.length : 0;

  let analysis: Record<string, unknown> | null = null;
  try {
    analysis = (
      await askJSON<Record<string, unknown>>({
        system: AGENTS.monitor_analyst.system,
        user: JSON.stringify({ brand: brand.name_he, results }),
        maxTokens: 2000,
      })
    ).data;
  } catch (e) {
    analysis = { error: (e as Error).message };
  }

  const run = { createdAt: new Date().toISOString(), visibility, results, analysis };
  await pushHistory(KEYS.monitor, run, 30);
  return NextResponse.json({ run });
}
