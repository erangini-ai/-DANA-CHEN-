"use client";
import { useState } from "react";
import { api, download, uploadAndRegister } from "@/lib/client";
import { runFFmpeg } from "@/lib/ffmpeg-client";
import type { Asset } from "@/lib/types";
import { ErrorBox, Head } from "../ui";

export default function Audio() {
  const [video, setVideo] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [music, setMusic] = useState<Asset | null>(null);
  const [out, setOut] = useState<Blob | null>(null);

  async function run() {
    if (!video) return;
    setError(null);
    setMusic(null);
    setOut(null);
    try {
      const ext = video.name.match(/\.(mp4|mov|m4v)$/i)?.[1]?.toLowerCase() ?? "mp4";
      setStatus("מחלץ אודיו…");
      const audio = await runFFmpeg([{ name: `in.${ext}`, data: video }], ["-i", `in.${ext}`, "-vn", "-c:a", "aac", "-b:a", "192k", "audio.m4a"], "audio.m4a", "audio/mp4");
      setStatus("מעלה…");
      const audioAsset = await uploadAndRegister(audio, `${video.name.replace(/\.[^.]+$/, "")}.m4a`, "audio");
      setStatus("מפריד קול ממוזיקה (Demucs, עד כמה דקות)…");
      const sep = await api<{ music: Asset; voice: Asset | null }>("/api/audio/separate", { body: { assetId: audioAsset.id } });
      setMusic(sep.music);
      setStatus("מחבר מחדש את הווידאו עם המוזיקה בלבד…");
      const remux = await runFFmpeg(
        [
          { name: `in.${ext}`, data: video },
          { name: "music.mp3", data: sep.music.url },
        ],
        ["-i", `in.${ext}`, "-i", "music.mp3", "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", "out.mp4"],
        "out.mp4",
        "video/mp4",
      );
      setOut(remux);
      setStatus(null);
    } catch (e) {
      setError((e as Error).message);
      setStatus(null);
    }
  }

  async function save() {
    if (!out || !video) return;
    await uploadAndRegister(out, `${video.name.replace(/\.[^.]+$/, "")}-music-only.mp4`, "video", { source: "audio_separation", parentId: music?.parentId });
    setStatus("נשמר בספרייה");
  }

  return (
    <>
      <Head title="אודיו" sub="הסרת קול מקליפ ושמירת המוזיקה ברקע (Demucs). הווידאו עצמו לא מקודד מחדש." />
      <section className="card stack">
        <input type="file" accept="video/*" onChange={(e) => setVideo(e.target.files?.[0] ?? null)} />
        <button onClick={run} disabled={!video || !!status}>הסר קול</button>
        {status && <div className="ok">{status}</div>}
      </section>
      <ErrorBox error={error} />
      {music && (
        <section className="card stack">
          <h3>מוזיקה בלבד</h3>
          <audio src={music.url} controls />
        </section>
      )}
      {out && (
        <section className="card stack">
          <video className="preview" src={URL.createObjectURL(out)} controls playsInline />
          <div className="row">
            <button onClick={save}>שמור בספרייה</button>
            <button className="ghost" onClick={() => download(out, "music-only.mp4")}>הורד</button>
          </div>
        </section>
      )}
    </>
  );
}
