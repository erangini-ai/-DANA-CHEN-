"use client";
import { useState } from "react";
import { AGENTS, LAB_STAGES, MAX_LOOPS, PLATFORM_HE } from "@/lib/agents";
import { api } from "@/lib/client";
import { CONFIDENCE_THRESHOLD } from "@/lib/compliance";
import { auditKind, publicText, type LabPackage } from "@/lib/lab";
import type { AuditResult, ContentPiece, LabStageOutput, Platform } from "@/lib/types";
import { PieceView } from "../piece-view";
import { ErrorBox, Head, useProducts } from "../ui";

type StepResp = { stage: string; agent: string; data: Record<string, unknown>; confidence: number };
type OfficerIssue = { field: string; quote: string; problem: string; fix: string; severity: "BLOCK" | "WARN" };
type LogLine = { label: string; status: "run" | "done" | "fail"; note?: string };

const strip = (d: Record<string, unknown>) => {
  const { confidence: _c, ...rest } = d;
  return rest;
};

export default function Lab() {
  const { products, error: pErr } = useProducts();
  const [slug, setSlug] = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram_reel");
  const [goal, setGoal] = useState("היכרות עם המוצר ותחושת השימוש בו");
  const [log, setLog] = useState<LogLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [piece, setPiece] = useState<ContentPiece | null>(null);

  const open = products.filter((p) => p.gate.allowed);
  const blocked = products.filter((p) => !p.gate.allowed);

  function mark(label: string, status: LogLine["status"], note?: string) {
    setLog((l) => {
      const i = l.findIndex((x) => x.label === label);
      const line = { label, status, note };
      return i === -1 ? [...l, line] : l.map((x, j) => (j === i ? line : x));
    });
  }

  async function step(stage: string, label: string, extra: Record<string, unknown>): Promise<StepResp> {
    mark(label, "run");
    try {
      const r = await api<StepResp>("/api/lab/step", { body: { stage, productSlug: slug, platform, goal, ...extra } });
      mark(label, "done", `ביטחון ${Math.round(r.confidence * 100)}%`);
      return r;
    } catch (e) {
      mark(label, "fail", (e as Error).message);
      throw e;
    }
  }

  async function run() {
    setBusy(true);
    setError(null);
    setPiece(null);
    setLog([]);
    try {
      const stages: Record<string, LabStageOutput> = {};
      const previous: Record<string, unknown> = {};
      const record = (r: StepResp, key = r.stage) => {
        stages[key] = { stage: r.stage, data: r.data, confidence: r.confidence };
        previous[r.stage] = strip(r.data);
      };

      // 1. Creative chain
      for (const s of ["strategist", "headliner", "scriptwriter", "art_director", "caption_writer"] as const) {
        record(await step(s, AGENTS[s].name_he, { previous }));
      }
      let pkg: LabPackage = {
        headline: String(stages.headliner.data.chosen ?? ""),
        script: strip(stages.scriptwriter.data) as LabPackage["script"],
        visual: strip(stages.art_director.data),
        caption_he: String(stages.caption_writer.data.caption_he ?? ""),
        hashtags: (stages.caption_writer.data.hashtags as string[]) ?? [],
      };
      const creativeConf =
        ["strategist", "headliner", "scriptwriter", "art_director", "caption_writer"].reduce((s, k) => s + stages[k].confidence, 0) / 5;

      // 2. Loop Engineering: audit ← officer ← critic ← (reviser) until GO or MAX_LOOPS
      let loops = 0;
      let officerIssues: OfficerIssue[] = [];
      let confidence = 0;
      for (;;) {
        const tag = loops ? ` · סבב ${loops + 1}` : "";
        mark(`בדיקה אוטומטית${tag}`, "run");
        const audit = await api<AuditResult>("/api/compliance", {
          body: { content: publicText(pkg), kind: auditKind(platform), productSlug: slug },
        });
        mark(`בדיקה אוטומטית${tag}`, audit.verdict === "BLOCK" ? "fail" : "done", `${audit.findings.length} ממצאים`);

        const officer = await step("compliance_officer", `${AGENTS.compliance_officer.name_he}${tag}`, { package: pkg, audit });
        officerIssues = (officer.data.issues as OfficerIssue[]) ?? [];
        const critic = await step("critic", `${AGENTS.critic.name_he}${tag}`, { package: pkg, audit, review: officer.data });
        record(officer, `compliance_officer_${loops}`);
        record(critic, `critic_${loops}`);

        const overall = Math.min(1, Math.max(0, Number(critic.data.overall) || 0));
        confidence = Math.min(overall, creativeConf);
        const clean =
          audit.verdict !== "BLOCK" && officer.data.verdict === "PASS" && !officerIssues.some((i) => i.severity === "BLOCK");
        if ((clean && confidence >= CONFIDENCE_THRESHOLD) || loops >= MAX_LOOPS) break;

        loops++;
        const rev = await step("reviser", `${AGENTS.reviser.name_he} · סבב ${loops}`, {
          package: pkg,
          audit,
          review: { compliance_officer: officer.data, critic: critic.data },
        });
        record(rev, `reviser_${loops}`);
        pkg = {
          headline: String(rev.data.headline ?? pkg.headline),
          script: (rev.data.script as LabPackage["script"]) ?? pkg.script,
          visual: (rev.data.visual as Record<string, unknown>) ?? pkg.visual,
          caption_he: String(rev.data.caption_he ?? pkg.caption_he),
          hashtags: (rev.data.hashtags as string[]) ?? pkg.hashtags,
        };
      }

      // 3. Server re-audits and assigns the verdict
      mark("שמירה ופסיקה", "run");
      const { piece } = await api<{ piece: ContentPiece }>("/api/lab/save", {
        body: { productSlug: slug, platform, goal, pkg, stages, loops, confidence, officerIssues },
      });
      mark("שמירה ופסיקה", "done", piece.verdict);
      setPiece(piece);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Head title="מעבדת תוכן" sub="אסטרטגית ← כותרות ← תסריט ← ויז'ואל ← כיתוב ← רגולציה ← עורכת, בלולאה עד GO." />
      <ErrorBox error={pErr} />

      <section className="card stack">
        <div>
          <label>מוצר</label>
          <select value={slug} onChange={(e) => setSlug(e.target.value)} disabled={busy}>
            <option value="">בחר מוצר…</option>
            {open.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
            {blocked.length > 0 && (
              <optgroup label="חסומים">
                {blocked.map((p) => (
                  <option key={p.slug} value={p.slug} disabled>
                    {p.name} · {p.gate.reasons[0]}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {products.length === 0 && <p className="muted">יבא קודם את products.json במוח המרכזי.</p>}
        </div>
        <div>
          <label>פלטפורמה</label>
          <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)} disabled={busy}>
            {Object.entries(PLATFORM_HE).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>מטרה</label>
          <input value={goal} onChange={(e) => setGoal(e.target.value)} disabled={busy} />
        </div>
        <button onClick={run} disabled={busy || !slug}>
          {busy ? "רץ…" : "הרץ פייפליין"}
        </button>
        <p className="muted">
          {LAB_STAGES.length} סוכנים + משכתבת, עד {MAX_LOOPS} סבבי תיקון. סף ביטחון ל-GO: {Math.round(CONFIDENCE_THRESHOLD * 100)}%.
        </p>
      </section>

      {log.length > 0 && (
        <section className="card">
          <h2>התקדמות</h2>
          <ul className="steps">
            {log.map((l) => (
              <li key={l.label}>
                <span>{l.label}</span>
                <span className="muted" style={{ color: l.status === "fail" ? "var(--block)" : undefined }}>
                  {l.status === "run" ? "…" : l.note}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ErrorBox error={error} />
      {piece && <PieceView piece={piece} />}
    </>
  );
}
