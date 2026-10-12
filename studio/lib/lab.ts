// Shared (client + server) helpers for the Content Lab package.
import type { Platform } from "./types.ts";

export interface Scene {
  t_start: number;
  t_end: number;
  on_screen_text: string;
  visual: string;
  asset_hint: string;
  motion?: string;
}

export interface LabPackage {
  headline: string;
  script: { mode?: string; scenes?: Scene[]; music_mood?: string } & Record<string, unknown>;
  visual: Record<string, unknown>;
  caption_he: string;
  hashtags: string[];
}

// Only text that is published to the audience is audited by regex.
export function publicText(pkg: LabPackage) {
  return {
    headline: pkg.headline,
    caption_he: pkg.caption_he,
    hashtags: pkg.hashtags,
    on_screen: (pkg.script?.scenes ?? []).map((s) => s.on_screen_text),
  };
}

export function auditKind(platform: Platform): "reel" | "post" {
  return platform === "instagram_reel" || platform === "tiktok" || platform === "instagram_story" ? "reel" : "post";
}

// Neutral reel props for the Remotion renderer (map to Reel.jsx props in the factory).
export function toReelJSON(pkg: LabPackage, productSlug: string, brand: { whatsapp_url: string; cta_he: string }) {
  return {
    product: productSlug,
    width: 1080,
    height: 1920,
    fps: 30,
    mode: pkg.script.mode ?? "product",
    headline: pkg.headline,
    scenes: (pkg.script.scenes ?? []).map((s) => ({
      from: Math.round(s.t_start * 30),
      durationInFrames: Math.max(1, Math.round((s.t_end - s.t_start) * 30)),
      caption: s.on_screen_text,
      asset_hint: s.asset_hint,
      motion: s.motion ?? "ken_burns",
    })),
    outro: { logo: true, cta: brand.cta_he, url: brand.whatsapp_url },
  };
}
