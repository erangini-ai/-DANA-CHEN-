"use client";
import { useState } from "react";
import { download, uploadAndRegister } from "@/lib/client";
import { CREAM_HEX, runFFmpeg } from "@/lib/ffmpeg-client";
import { AssetGrid, ErrorBox, Head, useAssets, useProducts } from "../ui";

type Frame = "pad" | "crop" | "keep";

export default function Video() {
  const { assets, reload } = useAssets();
  const { products } = useProducts();
  const [src, setSrc] = useState<{ data: Blob | string; name: string } | null>(null);
  const [start, setStart] = useState("0");
  const [end, setEnd] = useState("24");
  const [frame, setFrame] = useState<Frame>("pad");
  const [mute, setMute] = useState(false);
  const [productSlug, setProductSlug] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [out, setOut] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function render() {
    if (!src) return;
    setError(null);
    setOut(null);
    setSaved(false);
    setProgress(0);
    try {
      const ext = src.name.match(/\.(mp4|mov|m4v|webm)$/i)?.[1]?.toLowerCase() ?? "mp4";
      const vf =
        frame === "pad"
          ? `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=${CREAM_HEX},setsar=1,fps=30`
          : frame === "crop"
            ? "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30"
            : "fps=30";
      const s = Math.max(0, Number(start) || 0);
      const e = Math.max(s + 0.5, Number(end) || s + 24);
      const args = [
        "-ss", String(s), "-to", String(e), "-i", `in.${ext}`,
        "-vf", vf,
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23", "-pix_fmt", "yuv420p",
        ...(mute ? ["-an"] : ["-c:a", "aac", "-b:a", "128k"]),
        "-movflags", "+faststart", "out.mp4",
      ];
      setOut(await runFFmpeg([{ name: `in.${ext}`, data: src.data }], args, "out.mp4", "video/mp4", setProgress));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProgress(null);
    }
  }

  async function save() {
    if (!out) return;
    try {
      await uploadAndRegister(out, `${src?.name.replace(/\.[^.]+$/, "") ?? "clip"}-1080x1920.mp4`, "video", {
        productSlug: productSlug || undefined,
        source: "video_edit",
        width: frame === "keep" ? undefined : 1080,
        height: frame === "keep" ? undefined : 1920,
      });
      setSaved(true);
      reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      <Head title="וידאו" sub="חיתוך, התאמה ל-1080×1920 והשתקה. רץ בדפדפן, בלי שרת. מומלץ קליפים עד דקה באייפון." />

      <section className="card stack">
        <h2>מקור</h2>
        <input type="file" accept="video/*" onChange={(e) => e.target.files?.[0] && setSrc({ data: e.target.files[0], name: e.target.files[0].name })} />
        <p className="muted">או מהספרייה:</p>
        <AssetGrid assets={assets} kinds={["video"]} onSelect={(a) => setSrc({ data: a.url, name: a.name })} />
        {src && <p className="muted">נבחר: {src.name}</p>}
      </section>

      <section className="card stack">
        <div className="row">
          <div style={{ flex: 1 }}>
            <label>התחלה (שניות)</label>
            <input inputMode="decimal" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>סיום (שניות)</label>
            <input inputMode="decimal" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <div>
          <label>מסגור</label>
          <select value={frame} onChange={(e) => setFrame(e.target.value as Frame)}>
            <option value="pad">1080×1920 עם ריפוד קרם</option>
            <option value="crop">1080×1920 חיתוך למילוי</option>
            <option value="keep">גודל מקורי</option>
          </select>
        </div>
        <label className="row" style={{ color: "var(--ink)" }}>
          <input type="checkbox" checked={mute} onChange={(e) => setMute(e.target.checked)} style={{ width: "auto" }} /> השתק אודיו
        </label>
        <div>
          <label>שיוך למוצר (לא חובה)</label>
          <select value={productSlug} onChange={(e) => setProductSlug(e.target.value)}>
            <option value="">—</option>
            {products.map((p) => (
              <option key={p.slug} value={p.slug}>{p.name}</option>
            ))}
          </select>
        </div>
        <button onClick={render} disabled={!src || progress !== null}>
          {progress !== null ? `מעבד ${Math.round(progress * 100)}%` : "עבד"}
        </button>
        <p className="muted">טעינה ראשונה מורידה את ffmpeg (כ-30MB).</p>
      </section>

      <ErrorBox error={error} />
      {out && (
        <section className="card stack">
          <video className="preview" src={URL.createObjectURL(out)} controls playsInline />
          <div className="row">
            <button onClick={save} disabled={saved}>{saved ? "נשמר בספרייה" : "שמור בספרייה"}</button>
            <button className="ghost" onClick={() => download(out, "reel-1080x1920.mp4")}>הורד</button>
          </div>
        </section>
      )}
    </>
  );
}
