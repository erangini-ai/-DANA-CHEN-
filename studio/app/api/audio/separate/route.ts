import { NextResponse } from "next/server";
import { getAsset, persistRemote, saveAsset } from "@/lib/assets";
import { runCommunity } from "@/lib/replicate";

export const maxDuration = 300;

// Removes the voice from a track (Demucs htdemucs) and keeps the music bed.
export async function POST(req: Request) {
  const { assetId } = (await req.json()) as { assetId: string };
  const asset = await getAsset(assetId);
  if (!asset || asset.kind !== "audio") return NextResponse.json({ error: "audio asset not found" }, { status: 404 });
  try {
    const out = (await runCommunity("ryan5453/demucs", {
      audio: asset.url,
      isolate_stem: "vocals",
      format: "mp3",
    })) as { vocals?: string; no_vocals?: string };
    if (!out?.no_vocals) throw new Error("Demucs returned no no_vocals stem.");
    const music = await persistRemote(out.no_vocals, `audio/${asset.id}-music.mp3`);
    const musicAsset = await saveAsset({
      url: music.url,
      name: `${asset.name} · מוזיקה בלבד`,
      kind: "audio",
      contentType: music.contentType,
      source: "audio_separation",
      parentId: asset.id,
    });
    let voiceAsset = null;
    if (out.vocals) {
      const voice = await persistRemote(out.vocals, `audio/${asset.id}-voice.mp3`);
      voiceAsset = await saveAsset({
        url: voice.url,
        name: `${asset.name} · קול בלבד`,
        kind: "audio",
        contentType: voice.contentType,
        source: "audio_separation",
        parentId: asset.id,
      });
    }
    return NextResponse.json({ music: musicAsset, voice: voiceAsset });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
