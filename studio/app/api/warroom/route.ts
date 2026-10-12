import { NextResponse } from "next/server";
import { AGENTS } from "@/lib/agents";
import { askJSON } from "@/lib/claude";
import { KEYS, history, pushHistory } from "@/lib/store";

export const maxDuration = 300;

export async function GET() {
  return NextResponse.json({ reports: await history(KEYS.warroom, 10) });
}

export async function POST() {
  const agent = AGENTS.algorithm_analyst;
  try {
    const { data, citations } = await askJSON<Record<string, unknown>>({
      system: agent.system,
      user: `התאריך היום: ${new Date().toISOString().slice(0, 10)}. מותג: קליניקה לקוסמטיקה מתקדמת בנתניה, תוכן בעברית, רילס וסטוריז.`,
      maxTokens: 6000,
      webSearch: { maxUses: agent.webSearch ?? 6 },
    });
    const report = { ...data, citations, createdAt: new Date().toISOString() };
    await pushHistory(KEYS.warroom, report, 20);
    return NextResponse.json({ report });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
