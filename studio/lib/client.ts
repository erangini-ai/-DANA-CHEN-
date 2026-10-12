"use client";
import { upload } from "@vercel/blob/client";
import type { Asset, AssetKind } from "./types";

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? (init?.body !== undefined ? "POST" : "GET"),
    headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string; reasons?: string[] };
  if (!res.ok) {
    const reasons = json.reasons?.length ? `\n${json.reasons.join("\n")}` : "";
    throw new Error(`${json.error ?? `HTTP ${res.status}`}${reasons}`);
  }
  return json;
}

export function imageSize(src: Blob | string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = typeof src === "string" ? src : URL.createObjectURL(src);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      if (typeof src !== "string") URL.revokeObjectURL(url);
    };
    img.onerror = () => reject(new Error("לא ניתן לקרוא את התמונה"));
    img.src = url;
  });
}

export async function uploadAndRegister(
  file: Blob,
  name: string,
  kind: AssetKind,
  extra: Partial<Pick<Asset, "productSlug" | "source" | "parentId" | "width" | "height">> = {},
): Promise<Asset> {
  const contentType = file.type || "application/octet-stream";
  let dims: { width?: number; height?: number } = {};
  if (contentType.startsWith("image/") && !extra.width) dims = await imageSize(file).catch(() => ({}));
  const blob = await upload(`${kind}/${name}`, file, { access: "public", handleUploadUrl: "/api/upload", contentType });
  const { asset } = await api<{ asset: Asset }>("/api/assets", {
    body: { url: blob.url, name, kind, contentType, ...dims, ...extra },
  });
  return asset;
}

// Non-AI expansion for photos of Dana: centers the real photo on a cream canvas.
export async function creamPad(src: Blob | string, W: number, H: number, color = "#FAF8F5"): Promise<Blob> {
  // Remote images are fetched into a local object URL so the canvas is never tainted.
  const local = typeof src === "string" ? await (await fetch(src)).blob() : src;
  const objectUrl = URL.createObjectURL(local);
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("טעינת התמונה נכשלה"));
    img.src = objectUrl;
  });
  URL.revokeObjectURL(objectUrl);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  const scale = Math.min(W / img.naturalWidth, H / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("canvas export failed"))), "image/png"));
}

export function download(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export const KIND_HE: Record<AssetKind, string> = {
  product: "מוצר",
  broll: "B-roll",
  dana: "דנה (אמיתי)",
  video: "וידאו",
  audio: "אודיו",
};
