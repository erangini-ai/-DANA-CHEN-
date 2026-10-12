"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { ErrorBox, Head, type ProductRow } from "../ui";

interface BrainResp {
  brand: Record<string, unknown>;
  meta: { importedAt: string; count: number; fieldCoverage: Record<string, number>; sourceName: string } | null;
  notes: { id: string; source: string; title: string; body: { summary?: string }; createdAt: string }[];
  products: ProductRow[];
}

export default function Brain() {
  const [data, setData] = useState<BrainResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => api<BrainResp>("/api/brain").then(setData).catch((e: Error) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    setError(null);
    try {
      const json = JSON.parse(await f.text());
      await api("/api/brain", { body: { json, sourceName: f.name } });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Head title="מוח מרכזי" sub="products.json הוא מקור האמת היחיד. כל הסוכנים קוראים ממנו ומכללי המותג." />
      <ErrorBox error={error} />

      <section className="card stack">
        <h2>products.json</h2>
        {data?.meta ? (
          <p className="muted">
            {data.meta.count} מוצרים · {data.meta.sourceName} · יובא {new Date(data.meta.importedAt).toLocaleString("he-IL")}
          </p>
        ) : (
          <p className="muted">עוד לא יובא. העלה את products.json מהמפעל.</p>
        )}
        <label>
          ייבוא (מחליף את הקיים)
          <input type="file" accept="application/json,.json" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      </section>

      {data?.products.length ? (
        <section className="card">
          <h2>סטטוס מוצרים</h2>
          <table>
            <thead>
              <tr>
                <th>מוצר</th>
                <th>copy_status</th>
                <th>שער</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((p) => (
                <tr key={p.slug}>
                  <td>
                    {p.name}
                    <div className="muted">{p.slug}{p.gate.spfRequired ? " · דורש SPF" : ""}</div>
                    {!p.gate.allowed && <div className="muted" style={{ color: "var(--block)" }}>{p.gate.reasons.join(" ")}</div>}
                  </td>
                  <td>{p.copy_status || "—"}</td>
                  <td>{p.gate.allowed ? <span className="pill GO">פתוח</span> : <span className="pill BLOCK" title={p.gate.reasons.join("\n")}>חסום</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {data?.meta && (
        <section className="card">
          <h2>שדות שנקראו</h2>
          <p className="muted">כמה מוצרים מכילים כל שדה. כל השדות עוברים לסוכנים כמו שהם.</p>
          <div className="row">
            {Object.entries(data.meta.fieldCoverage).map(([k, n]) => (
              <span key={k} className="pill" style={{ color: "var(--ink-soft)" }}>
                {k} · {n}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h2>כללי מותג</h2>
        <pre>{data ? JSON.stringify(data.brand, null, 2) : "…"}</pre>
      </section>

      <section className="card">
        <h2>הערות מחקר</h2>
        {data?.notes.length ? (
          <ul className="steps">
            {data.notes.map((n) => (
              <li key={n.id}>
                <span>
                  {n.title}
                  <div className="muted">{n.body.summary}</div>
                </span>
                <span className="muted">{new Date(n.createdAt).toLocaleDateString("he-IL")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">ריק. הסורק מוסיף לכאן.</p>
        )}
      </section>
    </>
  );
}
