"use client";
import type { FFmpeg } from "@ffmpeg/ffmpeg";

type FFmpegModule = typeof import("@ffmpeg/ffmpeg");
// Served from /public/ffmpeg (copied on postinstall) so the module worker is same-origin.
const FFMPEG_ESM = "/ffmpeg/index.js";

// Single-thread core: runs on iPhone Safari without cross-origin isolation.
const CORE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
let instance: FFmpeg | null = null;

export async function getFFmpeg(onLog?: (line: string) => void): Promise<FFmpeg> {
  if (instance) return instance;
  const { FFmpeg } = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ FFMPEG_ESM)) as FFmpegModule;
  const { toBlobURL } = await import("@ffmpeg/util");
  const ff = new FFmpeg();
  if (onLog) ff.on("log", ({ message }) => onLog(message));
  await ff.load({
    coreURL: await toBlobURL(`${CORE}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${CORE}/ffmpeg-core.wasm`, "application/wasm"),
  });
  instance = ff;
  return ff;
}

export async function runFFmpeg(
  inputs: { name: string; data: Blob | string }[],
  args: string[],
  output: string,
  mime: string,
  onProgress?: (p: number) => void,
): Promise<Blob> {
  const ff = await getFFmpeg();
  const { fetchFile } = await import("@ffmpeg/util");
  const handler = ({ progress }: { progress: number }) => onProgress?.(Math.max(0, Math.min(1, progress)));
  ff.on("progress", handler);
  try {
    for (const i of inputs) await ff.writeFile(i.name, await fetchFile(i.data));
    const code = await ff.exec(args);
    if (code !== 0) throw new Error(`ffmpeg exited with ${code}`);
    const data = await ff.readFile(output);
    const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
    return new Blob([bytes], { type: mime });
  } finally {
    ff.off("progress", handler);
    for (const i of inputs) await ff.deleteFile(i.name).catch(() => undefined);
    await ff.deleteFile(output).catch(() => undefined);
  }
}

export const CREAM_HEX = "0xFAF8F5";
