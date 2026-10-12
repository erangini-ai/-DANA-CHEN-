import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { AGENTS } from "@/lib/agents";
import { brand, getNotes } from "@/lib/brain";
import { askJSON } from "@/lib/claude";
import { KEYS, newId, pushHistory } from "@/lib/store";

export const maxDuration = 120;

export async function GET() {
  return NextResponse.json({ notes: await getNotes() });
}

export async function POST(req: Request) {
  const { url } = (await req.json()) as { url: string };
  let target: URL;
  try {
    target = new URL(url);
    if (!["http:", "https:"].includes(target.protocol)) throw new Error();
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1|0\.)/.test(target.hostname)) throw new Error();
  } catch {
    return NextResponse.json({ error: "כתובת לא תקינה" }, { status: 400 });
  }

  const res = await fetch(target, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; DanaChenStudio/1.0)", "Accept-Language": "he,en;q=0.8" },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  }).catch((e: Error) => e);
  if (res instanceof Error || !res.ok) {
    return NextResponse.json({ error: `לא ניתן לקרוא את העמוד (${res instanceof Error ? res.message : res.status})` }, { status: 502 });
  }

  const $ = cheerio.load(await res.text());
  $("script, style, noscript, svg, iframe").remove();
  const page = {
    url: target.toString(),
    title: $("title").first().text().trim(),
    description: $('meta[name="description"]').attr("content") ?? $('meta[property="og:description"]').attr("content") ?? "",
    headings: $("h1, h2, h3").map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 40),
    text: $("body").text().replace(/\s+/g, " ").trim().slice(0, 12_000),
    images: $("img").map((_, el) => $(el).attr("alt") ?? "").get().filter(Boolean).slice(0, 30),
  };
  if (!page.text) return NextResponse.json({ error: "העמוד ריק או מרונדר בצד לקוח בלבד" }, { status: 422 });

  try {
    const { data } = await askJSON<Record<string, unknown>>({
      system: AGENTS.scraper_analyst.system,
      user: JSON.stringify({ brand: { name: brand.name_he, voice: brand.voice }, page }),
      maxTokens: 2500,
    });
    const note = { id: newId("nt"), source: page.url, title: page.title || page.url, body: data, createdAt: new Date().toISOString() };
    await pushHistory(KEYS.notes, note, 50);
    return NextResponse.json({ note, page: { title: page.title, headings: page.headings.slice(0, 10) } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
