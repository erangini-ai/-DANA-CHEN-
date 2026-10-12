"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { ErrorBox, Head } from "../ui";

interface Note { id: string; source: string; title: string; body: Record<string, unknown>; createdAt: string }

export default function Scraper() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<Note | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      setNote((await api<{ note: Note }>("/api/scraper", { body: { url } })).note);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const list = (k: string) => (Array.isArray(note?.body[k]) ? (note!.body[k] as string[]) : []);

  return (
    <>
      <Head title="סורק השראה" sub="עמוד של מתחרה או השראה ← תובנות שנשמרות במוח המרכזי ומוזנות לסוכנים." />
      <section className="card stack">
        <input type="url" inputMode="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} dir="ltr" />
        <button onClick={go} disabled={busy || !url}>{busy ? "סורק…" : "סרוק ונתח"}</button>
        <p className="muted">עמודים שמרונדרים רק בצד לקוח (כמו אינסטגרם) לא ייקראו.</p>
      </section>
      <ErrorBox error={error} />
      {note && (
        <section className="card stack">
          <h2>{note.title}</h2>
          <p>{String(note.body.summary ?? "")}</p>
          <p className="muted">טון: {String(note.body.tone ?? "")}</p>
          {[["content_patterns", "דפוסי תוכן"], ["ideas_for_dana", "רעיונות לדנה"], ["compliance_flags", "דגלי רגולציה"]].map(([k, t]) =>
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
  );
}
