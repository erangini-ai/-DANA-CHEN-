import {
  CTA_KINDS,
  CTA_REQUIRED,
  HARD_BLOCKLIST,
  PATTERN_RULES,
  PRICE_WORDS,
  SPF_NOTE,
  SPF_REQUIRED,
  TREATMENT_WORDS,
} from "./rules.ts";
import type { AuditResult, Finding, Verdict } from "./types.ts";

export const CONFIDENCE_THRESHOLD = 0.8;

export function normalizeSlug(s: string): string {
  return s.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

// ---- Layer 1: product gate (port of dana_bridge.py) -------------------------

export interface GateResult {
  allowed: boolean;
  reasons: string[];
  spfRequired: boolean;
}

export function gateProduct(p: { slug: string; name: string; copy_status: string }): GateResult {
  const slug = normalizeSlug(p.slug);
  const nameSlug = normalizeSlug(p.name);
  const reasons: string[] = [];
  if (HARD_BLOCKLIST.some((b) => slug.includes(b) || nameSlug.includes(b))) {
    reasons.push("המוצר ברשימת החסימה: הקופי לא אושר על ידי דנה.");
  }
  if (p.copy_status !== "COMPLETE") {
    reasons.push(`copy_status הוא "${p.copy_status || "חסר"}" ולא COMPLETE.`);
  }
  const spfRequired = SPF_REQUIRED.some((s) => slug.includes(s) || nameSlug.includes(s));
  return { allowed: reasons.length === 0, reasons, spfRequired };
}

// ---- Layer 2: creative audit (port of audit_creative) -----------------------

export function flattenStrings(value: unknown, path = ""): { field: string; text: string }[] {
  if (typeof value === "string") return value.trim() ? [{ field: path || "text", text: value }] : [];
  if (Array.isArray(value)) return value.flatMap((v, i) => flattenStrings(v, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      flattenStrings(v, path ? `${path}.${k}` : k),
    );
  }
  return [];
}

function sentences(text: string): string[] {
  return text.split(/[.!?\n•|]+/).map((s) => s.trim()).filter(Boolean);
}

export interface AuditOptions {
  productSlug?: string;
  productName?: string;
  kind: "caption" | "script" | "post" | "reel" | "visual" | "page" | "research";
  // Fields that hold machine notes (rationales, reviewer notes) are excluded from the audit.
  ignoreFields?: RegExp;
}

const DEFAULT_IGNORE = /(rationale|notes?_internal|reasoning|issues|critique|confidence|do_not|changes|problem|fix)$/i;

export function auditCreative(content: unknown, opts: AuditOptions): AuditResult {
  const ignore = opts.ignoreFields ?? DEFAULT_IGNORE;
  const parts = flattenStrings(content).filter((p) => !ignore.test(p.field.replace(/\[\d+\]$/, "")));
  const findings: Finding[] = [];
  const seen = new Set<string>();
  const add = (f: Finding) => {
    const key = `${f.rule}|${f.field}|${f.match}`;
    if (!seen.has(key)) {
      seen.add(key);
      findings.push(f);
    }
  };

  for (const { field, text } of parts) {
    for (const rule of PATTERN_RULES) {
      const m = text.match(rule.pattern);
      if (m) add({ rule: rule.id, severity: rule.severity, label_he: rule.label_he, match: m[0], field, fix_he: rule.fix_he });
    }
    for (const s of sentences(text)) {
      if (TREATMENT_WORDS.test(s) && PRICE_WORDS.test(s)) {
        add({
          rule: "treatment_price_promo",
          severity: "BLOCK",
          label_he: "פרסום מחיר או הנחה על טיפול",
          match: s.slice(0, 80),
          field,
          fix_he: "אין לפרסם מחירים או הנחות על טיפולים בקליניקה.",
        });
      }
    }
  }

  const all = parts.map((p) => p.text).join("\n");

  if (CTA_KINDS.has(opts.kind) && !CTA_REQUIRED.test(all)) {
    add({
      rule: "missing_cta",
      severity: "BLOCK",
      label_he: "חסר CTA לוואטסאפ",
      field: "*",
      fix_he: 'הוסיפי "וואטסאפ בביו" או wa.me/972522547575.',
    });
  }

  if (opts.productSlug && opts.kind !== "research") {
    const gate = gateProduct({ slug: opts.productSlug, name: opts.productName ?? "", copy_status: "COMPLETE" });
    if (gate.spfRequired && CTA_KINDS.has(opts.kind) && !SPF_NOTE.test(all)) {
      add({
        rule: "missing_spf_note",
        severity: "BLOCK",
        label_he: "חסרה הערת SPF / שימוש בערב",
        field: "*",
        fix_he: "מוצר עם חומצה או רטינואיד: הוסיפי המלצה לקרם הגנה או לשימוש בערב.",
      });
    }
  }

  return { verdict: verdictFor(findings), findings };
}

export function verdictFor(findings: Finding[], confidence = 1): Verdict {
  if (findings.some((f) => f.severity === "BLOCK")) return "BLOCK";
  if (findings.length > 0 || confidence < CONFIDENCE_THRESHOLD) return "REVIEW";
  return "GO";
}
