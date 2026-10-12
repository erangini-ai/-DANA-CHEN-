export type AssetKind = "product" | "broll" | "dana" | "video" | "audio";

export interface Asset {
  id: string;
  url: string;
  name: string;
  kind: AssetKind;
  contentType: string;
  width?: number;
  height?: number;
  productSlug?: string;
  source: "upload" | "expand" | "pad" | "audio_separation" | "video_edit";
  parentId?: string;
  createdAt: string;
}

export interface Product {
  slug: string;
  name: string;
  copy_status: string;
  raw: Record<string, unknown>;
}

export type Verdict = "GO" | "REVIEW" | "BLOCK";

export interface Finding {
  rule: string;
  severity: "BLOCK" | "WARN";
  label_he: string;
  match?: string;
  field?: string;
  fix_he: string;
}

export interface AuditResult {
  verdict: Verdict;
  findings: Finding[];
}

export type Platform = "instagram_reel" | "instagram_post" | "instagram_story" | "tiktok" | "facebook";

export interface LabStageOutput {
  stage: string;
  data: Record<string, unknown>;
  confidence: number;
}

export interface ContentPiece {
  id: string;
  productSlug: string;
  platform: Platform;
  goal: string;
  stages: Record<string, LabStageOutput>;
  final: {
    headline: string;
    caption_he: string;
    hashtags: string[];
    script: unknown;
    visual: unknown;
  };
  loops: number;
  confidence: number;
  audit: AuditResult;
  verdict: Verdict;
  mediaAssetId?: string;
  createdAt: string;
}

export interface ScheduleItem {
  id: string;
  pieceId: string;
  platform: Platform;
  publishAt: string;
  status: "scheduled" | "sent" | "failed" | "blocked";
  lastError?: string;
  sentAt?: string;
}
