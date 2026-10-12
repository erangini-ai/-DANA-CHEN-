"use client";
import { PLATFORM_HE } from "@/lib/agents";
import type { LabPackage } from "@/lib/lab";
import type { ContentPiece } from "@/lib/types";
import { Pill } from "./ui";

export function PieceView({ piece }: { piece: ContentPiece }) {
  const script = piece.final.script as LabPackage["script"];
  return (
    <section className="card stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>{piece.final.headline}</h2>
        <Pill v={piece.verdict} />
      </div>
      <p className="muted">
        {PLATFORM_HE[piece.platform]} · ביטחון {Math.round(piece.confidence * 100)}% · {piece.loops} סבבי תיקון
      </p>
      <div className="caption">{piece.final.caption_he}</div>
      <p className="muted">{piece.final.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}</p>

      {piece.audit.findings.length > 0 && (
        <div>
          <h3>ממצאי רגולציה</h3>
          <ul className="findings">
            {piece.audit.findings.map((f, i) => (
              <li key={i}>
                <Pill v={f.severity === "BLOCK" ? "BLOCK" : "REVIEW"} /> {f.label_he}
                {f.match && <span className="muted"> · "{f.match}"</span>}
                <div className="muted">{f.fix_he}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {script?.scenes?.length ? (
        <div>
          <h3>תסריט ({script.mode})</h3>
          <ul className="steps">
            {script.scenes.map((s, i) => (
              <li key={i}>
                <span>
                  {s.on_screen_text}
                  <div className="muted">{s.visual} · {s.asset_hint}</div>
                </span>
                <span className="muted">
                  {s.t_start}–{s.t_end}s
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
