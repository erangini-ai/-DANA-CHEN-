"use client";
import { useEffect, useState } from "react";
import { PLATFORM_HE } from "@/lib/agents";
import { api, download } from "@/lib/client";
import { toReelJSON, type LabPackage } from "@/lib/lab";
import type { ContentPiece } from "@/lib/types";
import { PieceView } from "../piece-view";
import { AssetGrid, ErrorBox, Head, Pill, useAssets } from "../ui";

export default function Library() {
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [brand, setBrand] = useState<{ whatsapp_url: string; cta_he: string } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [when, setWhen] = useState("");
  const { assets } = useAssets();

  const load = () =>
    api<{ pieces: ContentPiece[]; brand: { whatsapp_url: string; cta_he: string } }>("/api/lab/save")
      .then((r) => {
        setPieces(r.pieces);
        setBrand(r.brand);
      })
      .catch((e: Error) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const current = pieces.find((p) => p.id === openId) ?? null;

  async function act(fn: () => Promise<unknown>, ok: string) {
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(ok);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <Head title="ספריית תוכן" sub="כל מה שיצא מהמעבדה, עם פסיקת GO / REVIEW / BLOCK." />
      <ErrorBox error={error} />
      {notice && <div className="ok">{notice}</div>}

      <section className="card">
        {pieces.length === 0 ? (
          <p className="muted">ריק. הרץ את מעבדת התוכן.</p>
        ) : (
          <ul className="steps">
            {pieces.map((p) => (
              <li key={p.id} onClick={() => setOpenId(p.id === openId ? null : p.id)} style={{ cursor: "pointer" }}>
                <span>
                  {p.final.headline || "(ללא כותרת)"}
                  <div className="muted">
                    {p.productSlug} · {PLATFORM_HE[p.platform]} · {new Date(p.createdAt).toLocaleDateString("he-IL")}
                    {p.mediaAssetId ? " · מדיה מצורפת" : ""}
                  </div>
                </span>
                <Pill v={p.verdict} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {current && (
        <>
          <PieceView piece={current} />
          <section className="card stack">
            <h3>מדיה לפרסום</h3>
            <p className="muted">בחר את הריל או התמונה הסופיים שילוו את הפריט.</p>
            <AssetGrid
              assets={assets}
              kinds={["video", "product", "broll", "dana"]}
              selected={current.mediaAssetId}
              onSelect={(a) => act(() => api("/api/lab/save", { method: "PATCH", body: { id: current.id, mediaAssetId: a.id } }), "המדיה צורפה")}
            />
            <div className="row">
              <button
                className="ghost"
                onClick={() =>
                  brand &&
                  download(
                    new Blob([JSON.stringify(toReelJSON(current.final as unknown as LabPackage, current.productSlug, brand), null, 2)], {
                      type: "application/json",
                    }),
                    `${current.productSlug}-reel.json`,
                  )
                }
              >
                reel.json ל-Remotion
              </button>
              <button
                className="ghost"
                onClick={() => navigator.clipboard.writeText(`${current.final.caption_he}\n\n${current.final.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`).then(() => setNotice("הכיתוב הועתק"))}
              >
                העתק כיתוב
              </button>
              <button className="ghost" onClick={() => confirm("למחוק את הפריט?") && act(() => api(`/api/lab/save?id=${current.id}`, { method: "DELETE" }).then(() => setOpenId(null)), "נמחק")}>
                מחק
              </button>
            </div>
            {current.verdict === "GO" ? (
              <div className="stack">
                <label>
                  תזמון פרסום
                  <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
                </label>
                <button
                  disabled={!when || !current.mediaAssetId}
                  onClick={() =>
                    act(
                      () => api("/api/schedule", { body: { pieceId: current.id, publishAt: new Date(when).toISOString() } }),
                      "נוסף לתזמון",
                    )
                  }
                >
                  תזמן
                </button>
                {!current.mediaAssetId && <p className="muted">צרף מדיה לפני תזמון.</p>}
              </div>
            ) : (
              <p className="muted">רק פריט בסטטוס GO ניתן לתזמון. הרץ שוב במעבדה אחרי תיקון.</p>
            )}
          </section>
        </>
      )}
    </>
  );
}
