"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { ErrorBox, Head } from "../ui";

interface Update { platform: string; change: string; date: string; source_url: string; implication_for_dana: string }
interface Report { updates?: Update[]; recommendations?: string[]; citations?: { url: string; title: string }[]; createdAt: string }

export default function WarRoom() {
  const [reports, setReports] = useState<Report[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ reports: Report[] }>("/api/warroom").then((r) => setReports(r.reports)).catch((e: Error) => setError(e.message));
  }, []);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const { report } = await api<{ report: Report }>("/api/warroom", { body: {} });
      setReports((r) => [report, ...r]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const latest = reports[0];
  return (
    <>
      <Head title="חדר מלחמה" sub="חיפוש חי של שינויי אלגוריתם באינסטגרם, טיקטוק ופייסבוק, עם מקורות." />
      <section className="card stack">
        <button onClick={run} disabled={busy}>{busy ? "מחפש ברשת… (עד דקה)" : "הרץ סריקה"}</button>
        {latest && <p className="muted">סריקה אחרונה: {new Date(latest.createdAt).toLocaleString("he-IL")}</p>}
      </section>
      <ErrorBox error={error} />
      {latest && (
        <>
          <section className="card">
            <h2>עדכונים</h2>
            {latest.updates?.length ? (
              <ul className="steps">
                {latest.updates.map((u, i) => (
                  <li key={i} style={{ display: "block" }}>
                    <strong>{u.platform}</strong> · <span className="muted">{u.date}</span>
                    <div>{u.change}</div>
                    <div className="muted">{u.implication_for_dana}</div>
                    {u.source_url && <a href={u.source_url} target="_blank" rel="noreferrer" className="muted" dir="ltr">מקור</a>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">לא נמצאו עדכונים מבוססי מקור.</p>
            )}
          </section>
          {latest.recommendations?.length ? (
            <section className="card">
              <h2>המלצות</h2>
              <ul>{latest.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </section>
          ) : null}
        </>
      )}
    </>
  );
}
