// Regulatory rules for a cosmetic (non-medical) clinic.
// TS port of the factory's dana_bridge.py + audit_creative rule set, rebuilt from the
// documented rules. Diff against config/regulatory_rules.json in the factory repo and
// extend here — this file is the only place rules live in the studio.

export type Severity = "BLOCK" | "WARN";

export interface PatternRule {
  id: string;
  severity: Severity;
  label_he: string;
  pattern: RegExp;
  fix_he: string;
}

// Hebrew has no \b support in JS regex, so patterns are substring-based and
// written to tolerate the attached prefixes ה/ו/ב/ל/מ/ש/כ.
export const PATTERN_RULES: PatternRule[] = [
  {
    id: "medical_claim",
    severity: "BLOCK",
    label_he: "טענה רפואית על מוצר קוסמטי",
    pattern: /רפואי|רפואית|medical|clinical[- ]grade|dermatologist[- ]grade|pharmaceutical/i,
    fix_he: "החליפי בשפה חווייתית: מרקם, תחושה, טקס טיפוח.",
  },
  {
    id: "cure_claim",
    severity: "BLOCK",
    label_he: "טענת ריפוי או טיפול במצב עור",
    pattern:
      /ריפוי|מרפא(?![הת])|מרפאים|מעלים קמטים|מעלימה קמטים|מחסל|מחסלת|מונע הזדקנות|עוצר הזדקנות|נגד אקנה|מטפל באקנה|מטפלת באקנה|\bcures?\b|\bheals?\b|treats? acne|eliminates? wrinkles|removes? wrinkles|reverses? aging/i,
    fix_he: "אסור לטעון לריפוי או לטיפול במצב. תארי חוויה ותחושה בלבד.",
  },
  {
    id: "guarantee",
    severity: "BLOCK",
    label_he: "הבטחת תוצאה",
    pattern: /מובטח|מובטחת|מובטחות|מבטיח|מבטיחה|אחריות לתוצאות|100%|guarantee|guaranteed|proven results/i,
    fix_he: "הסירי כל הבטחה לתוצאה.",
  },
  {
    id: "before_after",
    severity: "BLOCK",
    label_he: "הפניה ללפני/אחרי",
    pattern: /לפני\s*(ו|\/|-)?\s*אחרי|before\s*(&|and|\/|-)?\s*after/i,
    fix_he: "אין להשתמש בלפני/אחרי בתוכן שיווקי.",
  },
  {
    id: "dana_attributed_speech",
    severity: "BLOCK",
    label_he: "מילים בפי דנה שהיא לא אמרה",
    pattern:
      /דנה\s*(אומרת|ממליצה|מספרת|מסבירה|מגלה|חושפת|משתפת)|לדברי דנה|דנה\s*:|dana\s+(says|recommends|explains|shares)|"[^"]*"\s*[-–—]\s*דנה/i,
    fix_he: "אין לייחס ציטוט לדנה. כתבי בקול המותג, לא בגוף ראשון שלה.",
  },
  {
    id: "results_timing",
    severity: "WARN",
    label_he: "התחייבות לזמן תוצאה",
    pattern: /תוך\s*\d+\s*(ימים|יום|שבועות|שבוע|דקות)|in\s+\d+\s+(days|weeks|minutes)/i,
    fix_he: "הימנעי מלוח זמנים לתוצאה.",
  },
  {
    id: "superlative",
    severity: "WARN",
    label_he: "סופרלטיב לא מבוסס",
    pattern: /הכי טוב|הטוב ביותר|הטובה ביותר|מספר\s*1|#1|best in|the best|number one/i,
    fix_he: "החליפי בתיאור איכותי בלי השוואה.",
  },
  {
    id: "clinic_medical_framing",
    severity: "WARN",
    label_he: "מסגור רפואי לקליניקה",
    pattern: /מרפא[הת]|מטופלים|מטופלות|(^|[\s"'(ובהלמשכ])רופא(ה|ים|ות)?(?=[\s.,!?:]|$)/,
    fix_he: "השתמשי ב'קליניקה' ו'לקוחות'.",
  },
];

// Price/discount near a treatment word in the same sentence = treatment-price promotion.
export const TREATMENT_WORDS = /טיפול|טיפולים|treatment|facial|פילינג|peel/i;
export const PRICE_WORDS = /הנחה|מבצע|\d+\s*%|₪|ש"ח|שקל|discount|% off|\bsale\b|price/i;

// Product slugs (normalized: lowercase, '-' -> '_').
export const HARD_BLOCKLIST = ["phoenix", "tranquilo"];
export const SPF_REQUIRED = ["glyco_10", "bright_eyes", "one_tone", "phoenix"];
export const SPF_NOTE = /SPF|קרם הגנה|הגנה מהשמש|מקדם הגנה|לשימוש בערב|בשעות הערב/i;

export const CTA_REQUIRED = /וואטסאפ בביו|wa\.me\/972522547575/;

// Content kinds that are published to the public and must carry the CTA.
export const CTA_KINDS = new Set(["caption", "script", "post", "reel"]);
