import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY.");
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

export interface AskOptions {
  system: string;
  user: string;
  maxTokens?: number;
  webSearch?: { maxUses: number };
}

export interface AskResult<T> {
  data: T;
  text: string;
  citations: { url: string; title: string }[];
}

export function extractJSON<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const end = body.lastIndexOf("}");
  let start = body.indexOf("{");
  for (let tries = 0; start !== -1 && start < end && tries < 25; tries++) {
    try {
      return JSON.parse(body.slice(start, end + 1)) as T;
    } catch {
      start = body.indexOf("{", start + 1);
    }
  }
  throw new Error(`Agent did not return valid JSON: ${text.slice(0, 200)}`);
}

export async function askJSON<T>(opts: AskOptions): Promise<AskResult<T>> {
  const tools: Anthropic.Messages.ToolUnion[] = opts.webSearch
    ? [{ type: "web_search_20250305", name: "web_search", max_uses: opts.webSearch.maxUses }]
    : [];

  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 4000,
    system: `${opts.system}\n\nהחזר JSON תקין בלבד, בלי טקסט לפני או אחרי.`,
    messages: [{ role: "user", content: opts.user }],
    ...(tools.length ? { tools } : {}),
  });

  const textBlocks = res.content.filter((b): b is Anthropic.Messages.TextBlock => b.type === "text");
  // With web search, the final JSON is in the last text block(s); earlier ones narrate.
  const text = textBlocks.map((b) => b.text).join("");
  const citations: { url: string; title: string }[] = [];
  for (const b of textBlocks) {
    for (const c of b.citations ?? []) {
      if (c.type === "web_search_result_location" && !citations.some((x) => x.url === c.url)) {
        citations.push({ url: c.url, title: c.title ?? c.url });
      }
    }
  }
  return { data: extractJSON<T>(text), text, citations };
}
