"use client";
import { useState } from "react";
import { api, creamPad, KIND_HE, uploadAndRegister } from "@/lib/client";
import type { Asset, AssetKind } from "@/lib/types";
import { AssetGrid, ErrorBox, Head, useAssets, useProducts } from "../ui";

const FORMATS: Record<string, [number, number]> = {
  "9:16": [1080, 1920],
  "4:5": [1080, 1350],
  "1:1": [1080, 1080],
  "16:9": [1920, 1080],
};

export default function Media() {
  const { assets, reload, error: aErr } = useAssets();
  const { products } = useProducts();
  const [kind, setKind] = useState<AssetKind>("product");
  const [productSlug, setProductSlug] = useState("");
  const [sel, setSel] = useState<Asset | null>(null);
  const [format, setFormat] = useState("9:16");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Asset | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    try {
      for (const [i, f] of Array.from(files).entries()) {
        setBusy(`מעלה ${i + 1}/${files.length}…`);
        await uploadAndRegister(f, f.name, kind, { productSlug: productSlug || undefined });
      }
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function expandAI() {
    if (!sel) return;
    setBusy("Bria מרחיבה את התמונה…");
    setError(null);
    setResult(null);
    try {
      const { asset } = await api<{ asset: Asset }>("/api/media/expand", { body: { assetId: sel.id, format } });
      setResult(asset);
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function pad() {
    if (!sel) return;
    setBusy("מרפד בקרם…");
    setError(null);
    setResult(null);
    try {
      const [W, H] = FORMATS[format];
      const blob = await creamPad(sel.url, W, H);
      const asset = await uploadAndRegister(blob, `${sel.name.replace(/\.[^.]+$/, "")}-${format.replace(":", "x")}.png`, sel.kind, {
        productSlug: sel.productSlug,
        source: "pad",
        parentId: sel.id,
        width: W,
        height: H,
      });
      setResult(asset);
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const isImage = sel?.contentType.startsWith("image/");
  const aiAllowed = isImage && (sel?.kind === "product" || sel?.kind === "broll");

  return (
    <>
      <Head title="מדיה" sub="העלאה, הרחבת תמונה ליחסי ריל/פוסט/סטורי, ספריית נכסים." />
      <ErrorBox error={aErr} />

      <section className="card stack">
        <h2>העלאה</h2>
        <div className="row" style={{ alignItems: "stretch" }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label>סוג</label>
            <select value={kind} onChange={(e) => setKind(e.target.value as AssetKind)}>
              {(Object.keys(KIND_HE) as AssetKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_HE[k]}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label>מוצר (לא חובה)</label>
            <select value={productSlug} onChange={(e) => setProductSlug(e.target.value)}>
              <option value="">—</option>
              {products.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {kind === "dana" && <p className="muted">תמונות אמיתיות של דנה בלבד. הן לעולם לא נשלחות למודל גנרטיבי.</p>}
        <input type="file" multiple accept="image/*,video/*,audio/*" disabled={!!busy} onChange={(e) => onFiles(e.target.files)} />
      </section>

      <section className="card stack">
        <h2>ספרייה</h2>
        <AssetGrid assets={assets} selected={sel?.id} onSelect={(a) => { setSel(a); setResult(null); }} />
      </section>

      {sel && (
        <section className="card stack">
          <h2>{sel.name}</h2>
          <p className="muted">
            {KIND_HE[sel.kind]}
            {sel.width ? ` · ${sel.width}×${sel.height}` : ""}
            {sel.productSlug ? ` · ${sel.productSlug}` : ""}
          </p>
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="preview" src={sel.url} alt={sel.name} />
          ) : sel.contentType.startsWith("video/") ? (
            <video className="preview" src={sel.url} controls playsInline />
          ) : (
            <audio src={sel.url} controls />
          )}
          {isImage && (
            <>
              <div>
                <label>יחס יעד</label>
                <select value={format} onChange={(e) => setFormat(e.target.value)}>
                  {Object.entries(FORMATS).map(([f, [w, h]]) => (
                    <option key={f} value={f}>
                      {f} · {w}×{h}
                    </option>
                  ))}
                </select>
              </div>
              <div className="row">
                <button onClick={expandAI} disabled={!!busy || !aiAllowed || !sel.width}>
                  הרחבה ב-AI
                </button>
                <button className="ghost" onClick={pad} disabled={!!busy}>
                  ריפוד קרם (ללא AI)
                </button>
              </div>
              {!aiAllowed && <p className="muted">הרחבה ב-AI זמינה רק למוצר ו-B-roll. לתמונות של דנה: ריפוד קרם.</p>}
            </>
          )}
        </section>
      )}

      {busy && <div className="ok">{busy}</div>}
      <ErrorBox error={error} />
      {result && (
        <section className="card stack">
          <h3>תוצאה</h3>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="preview" src={result.url} alt={result.name} />
          <a className="btn ghost" href={result.url} target="_blank" rel="noreferrer">
            פתח / שמור
          </a>
        </section>
      )}
    </>
  );
}
