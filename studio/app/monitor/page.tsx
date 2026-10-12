"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { ErrorBox, Head } from "../ui";

interface Result { provider: string; query: string; mentioned: boolean; excerpt: string; error?: string }
interface Run { createdAt: string; visibility: number; results: Result[]; analysis: Record<string, unknown> | null }

export default function Monitor() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [providers, setProviders] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ runs: Run[]; providers: string[] }>("/api/monitor")
      .then((r) => { setRuns(r.runs); setProviders(r.providers); })
      .catch((e: Error) => setError(e.message));
  }, []);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const { run } = await api<{ run: Run }>("/api/monitor", { body: {} });
      setRuns((r) => [run, ...r]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const latest = runs[0];
  const list = (k: string) => (Array.isArray(latest?.analysis?.[k]) ? (latest!.analysis![k] as string[]) : []);

  return (
    <>
      <Head title="ניטור מותג" sub="האם מנועי AI מזכירים את דנה חן כשמחפשים קליניקה בנתניה." />
      <section className="card stack">
        <p className="muted">מנועים פעילים: {providers.join(", ") || "…"}</p>
        <button onClick={run} disabled={busy}>{busy ? "שואל את המנועים…" : "הרץ ניטור"}</button>
      </section>
      <ErrorBox error={error} />
      {latest && (
        <>
          <section className="card">
            <div className="stat">{Math.round(latest.visibility * 100)}%</div>
            <p className="muted">מהתשובות הזכירו את המותג · {new Date(latest.createdAt).toLocaleString("he-IL")}</p>
            {runs.length > 1 && (
              <p className="muted">קודם: {runs.slice(1, 6).map((r) => `${Math.round(r.visibility * 100)}%`).join(" · ")}</p>
            )}
          </section>
          <section className="card">
            <table>
              <thead><tr><th>שאילתה</th><th>מנוע</th><th>אזכור</th></tr></thead>
              <tbody>
                {latest.results.map((r, i) => (
                  <tr key={i}>
                    <td>{r.query}</td>
                    <td>{r.provider}</td>
                    <td>{r.error ? <span className="pill BLOCK" title={r.error}>שגיאה</span> : r.mentioned ? <span className="pill GO">כן</span> : <span className="pill REVIEW">לא</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          {latest.analysis && (
            <section className="card stack">
              <p>{String(latest.analysis.summary ?? latest.analysis.error ?? "")}</p>
              {[["competitors_seen", "מתחרים שהופיעו"], ["content_gaps", "פערי תוכן"], ["actions", "פעולות"]].map(([k, t]) =>
                list(k).length ? (
                  <div key={k}>
                    <h3>{t}</h3>
                    <ul>{list(k).map((x, i) => <li key={i}>{x}</li>)}</ul>
                  </div>
                ) : null,
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}
