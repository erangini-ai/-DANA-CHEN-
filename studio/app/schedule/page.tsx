"use client";
import { useEffect, useState } from "react";
import { PLATFORM_HE } from "@/lib/agents";
import { api } from "@/lib/client";
import type { ScheduleItem } from "@/lib/types";
import { ErrorBox, Head, Pill } from "../ui";

export default function Schedule() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [make, setMake] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    api<{ items: ScheduleItem[]; makeConfigured: boolean }>("/api/schedule")
      .then((r) => { setItems(r.items); setMake(r.makeConfigured); })
      .catch((e: Error) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function act(p: Promise<unknown>) {
    setError(null);
    try { await p; await load(); } catch (e) { setError((e as Error).message); }
  }

  return (
    <>
      <Head title="תזמון" sub="פרסום דרך Make. כל פרסום עובר שוב את השער והבדיקה הרגולטורית." />
      {!make && <div className="err">MAKE_WEBHOOK_URL לא מוגדר: פריטים יסומנו failed בזמן הפרסום.</div>}
      <ErrorBox error={error} />
      <section className="card">
        {items.length === 0 ? (
          <p className="muted">אין פריטים מתוזמנים. תזמן מתוך ספריית התוכן.</p>
        ) : (
          <ul className="steps">
            {items.map((i) => (
              <li key={i.id} style={{ display: "block" }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span>{new Date(i.publishAt).toLocaleString("he-IL")} · {PLATFORM_HE[i.platform]}</span>
                  <Pill v={i.status} />
                </div>
                {i.lastError && <div className="muted" style={{ color: "var(--block)" }}>{i.lastError}</div>}
                <div className="row" style={{ marginTop: 6 }}>
                  {i.status !== "sent" && <button className="ghost" onClick={() => act(api("/api/schedule/publish", { body: { id: i.id } }))}>פרסם עכשיו</button>}
                  <button className="ghost" onClick={() => act(api(`/api/schedule?id=${i.id}`, { method: "DELETE" }))}>הסר</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="muted">ה-cron רץ פעם ביום ב-05:00 UTC (08:00 בשעון קיץ, 07:00 בשעון חורף) ומפרסם כל מה שהגיע זמנו. "פרסם עכשיו" עוקף את ההמתנה.</p>
    </>
  );
}
