import { put } from "@vercel/blob";
import { KEYS, hAll, hGet, hPut, newId } from "./store.ts";
import type { Asset, AssetKind } from "./types.ts";

// Replicate output URLs expire, so every generated file is copied into Blob immediately.
export async function persistRemote(url: string, pathname: string): Promise<{ url: string; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download ${url} failed: ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  const blob = await put(pathname, Buffer.from(await res.arrayBuffer()), {
    access: "public",
    addRandomSuffix: true,
    contentType,
  });
  return { url: blob.url, contentType };
}

export async function saveAsset(a: Omit<Asset, "id" | "createdAt">): Promise<Asset> {
  const asset: Asset = { ...a, id: newId("as"), createdAt: new Date().toISOString() };
  await hPut(KEYS.assets, asset.id, asset);
  return asset;
}

export const listAssets = () => hAll<Asset>(KEYS.assets);
export const getAsset = (id: string) => hGet<Asset>(KEYS.assets, id);

export const ASSET_KINDS: AssetKind[] = ["product", "broll", "dana", "video", "audio"];

// Hard rule: any asset depicting Dana may never be sent to a generative model.
export function assertNotDana(asset: Asset): void {
  if (asset.kind === "dana") {
    throw new Error("חסום: תמונה של דנה לא נשלחת למודל גנרטיבי. השתמש בריפוד קרם (ללא AI).");
  }
}
